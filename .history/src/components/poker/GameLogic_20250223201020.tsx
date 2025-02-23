import { GameContext, Card, Player } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { evaluateHand } from '@/utils/pokerLogic';

const TIMEOUT_DURATION = 15000; // 15 seconds timeout for player actions
const FORCE_PROGRESS_DURATION = 30000; // 30 seconds to force game progression
const FORCE_ACTION_DURATION = 15000; // 15 seconds to force action for inactive players

type Position = 'bottom' | 'bottomRight' | 'right' | 'topRight' | 'top' | 'topLeft' | 'left' | 'bottomLeft';

const positions: Position[] = [
  'bottom', 'bottomRight', 'right', 'topRight',
  'top', 'topLeft', 'left', 'bottomLeft'
];

type BetHandler = (amount: number) => Promise<void>;
type FoldHandler = () => Promise<void>;

interface GameLogicHook {
  dealCards: () => Promise<void>;
  dealCommunityCards: () => Promise<void>;
  evaluateWinner: () => Promise<void>;
  resetGame: () => Promise<void>;
}

export const useGameLogic = (
  gameContext: GameContext,
  updateGameState: (updater: (prevState: GameContext) => GameContext) => void
): GameLogicHook => {
  const dealCards = async (): Promise<void> => {
    try {
      const deck = generateDeck();
      const playerCards = gameContext.players.map(() => [
        deck.pop()!,
        deck.pop()!
      ]);

      // Update player cards in database
      for (let i = 0; i < gameContext.players.length; i++) {
        const { error: updateError } = await supabase
          .from('game_players')
          .update({
            cards: JSON.stringify(playerCards[i]),
            is_active: true,
            is_turn: i === (gameContext.dealerPosition + 1) % gameContext.players.length
          })
          .eq('game_id', gameContext.gameId)
          .eq('user_id', gameContext.players[i].id);

        if (updateError) {
          console.error('Error updating player cards:', updateError);
          toast.error('Failed to deal cards');
          return;
        }
      }

      // Update game state
      const { error: gameError } = await supabase
        .from('games')
        .update({
          status: 'betting',
          current_player_index: (gameContext.dealerPosition + 1) % gameContext.players.length
        })
        .eq('id', gameContext.gameId);

      if (gameError) {
        console.error('Error updating game state:', gameError);
        toast.error('Failed to start betting round');
        return;
      }

      // Update game context
      updateGameState(prev => ({
        ...prev,
        gameState: 'betting',
        players: prev.players.map((player, index) => ({
          ...player,
          cards: playerCards[index],
          isActive: true,
          isTurn: index === (prev.dealerPosition + 1) % prev.players.length,
          hasActed: false,
          hasFolded: false,
          currentBet: 0,
          lastAction: undefined
        })),
        currentPlayer: (prev.dealerPosition + 1) % prev.players.length
      }));

      toast.success('Cards dealt');
    } catch (error) {
      console.error('Error dealing cards:', error);
      toast.error('Failed to deal cards');
    }
  };

  const dealCommunityCards = async (): Promise<void> => {
    try {
      const deck = generateDeck();
      gameContext.players.forEach(player => {
        player.cards.forEach(card => {
          const index = deck.findIndex(c => c.suit === card.suit && c.rank === card.rank);
          if (index !== -1) {
            deck.splice(index, 1);
          }
        });
      });

      let newCommunityCards: Card[];
      if (gameContext.communityCards.length === 0) {
        // Deal flop
        newCommunityCards = [deck.pop()!, deck.pop()!, deck.pop()!].map(card => ({
          ...card,
          faceUp: true
        }));
      } else if (gameContext.communityCards.length === 3) {
        // Deal turn
        newCommunityCards = [...gameContext.communityCards, { ...deck.pop()!, faceUp: true }];
      } else if (gameContext.communityCards.length === 4) {
        // Deal river
        newCommunityCards = [...gameContext.communityCards, { ...deck.pop()!, faceUp: true }];
      } else {
        console.error('Invalid community cards state');
        toast.error('Invalid game state');
        return;
      }

      // Update community cards in database
      const { error: updateError } = await supabase
        .from('games')
        .update({
          community_cards: JSON.stringify(newCommunityCards),
          current_player_index: (gameContext.dealerPosition + 1) % gameContext.players.length
        })
        .eq('id', gameContext.gameId);

      if (updateError) {
        console.error('Error updating community cards:', updateError);
        toast.error('Failed to deal community cards');
        return;
      }

      // Reset player states for new betting round
      for (const player of gameContext.players) {
        if (!player.hasFolded) {
          const { error: playerError } = await supabase
            .from('game_players')
            .update({
              is_turn: player.position === gameContext.players[(gameContext.dealerPosition + 1) % gameContext.players.length].position,
              current_bet: 0
            })
            .eq('game_id', gameContext.gameId)
            .eq('user_id', player.id);

          if (playerError) {
            console.error('Error resetting player state:', playerError);
            toast.error('Failed to reset player states');
            return;
          }
        }
      }

      // Update game context
      updateGameState(prev => ({
        ...prev,
        communityCards: newCommunityCards,
        currentBet: 0,
        players: prev.players.map((player, index) => ({
          ...player,
          currentBet: 0,
          hasActed: false,
          isTurn: !player.hasFolded && index === (prev.dealerPosition + 1) % prev.players.length
        })),
        currentPlayer: (prev.dealerPosition + 1) % prev.players.length
      }));

      toast.success('Community cards dealt');
    } catch (error) {
      console.error('Error dealing community cards:', error);
      toast.error('Failed to deal community cards');
    }
  };

  const evaluateWinner = async (): Promise<void> => {
    try {
      const activePlayers = gameContext.players.filter(p => !p.hasFolded);
      if (activePlayers.length === 0) {
        console.error('No active players to evaluate');
        toast.error('No active players');
        return;
      }

      // Calculate hand scores
      const playerScores = activePlayers.map(player => ({
        player,
        score: evaluateHand([...player.cards, ...gameContext.communityCards])
      }));

      // Find winner(s)
      const maxScore = Math.max(...playerScores.map(ps => ps.score));
      const winners = playerScores.filter(ps => ps.score === maxScore).map(ps => ps.player);

      // Calculate winnings
      const totalPot = gameContext.players.reduce((sum, p) => sum + (p.currentBet || 0), 0);
      const winAmount = Math.floor(totalPot / winners.length);

      // Update winners in database
      for (const winner of winners) {
        const { error: updateError } = await supabase
          .from('game_players')
          .update({
            chips: winner.chips + winAmount,
            score: maxScore
          })
          .eq('game_id', gameContext.gameId)
          .eq('user_id', winner.id);

        if (updateError) {
          console.error('Error updating winner:', updateError);
          toast.error('Failed to update winner');
          return;
        }
      }

      // Update game state
      const { error: gameError } = await supabase
        .from('games')
        .update({
          status: 'complete',
          winner_id: winners[0].id
        })
        .eq('id', gameContext.gameId);

      if (gameError) {
        console.error('Error updating game state:', gameError);
        toast.error('Failed to complete game');
        return;
      }

      // Update game context
      updateGameState(prev => ({
        ...prev,
        gameState: 'complete',
        players: prev.players.map(player => {
          const isWinner = winners.some(w => w.id === player.id);
          return {
            ...player,
            chips: isWinner ? player.chips + winAmount : player.chips,
            score: isWinner ? maxScore : player.score,
            isTurn: false
          };
        })
      }));

      toast.success(`Winner${winners.length > 1 ? 's' : ''}: ${winners.map(w => w.name).join(', ')}`);
    } catch (error) {
      console.error('Error evaluating winner:', error);
      toast.error('Failed to evaluate winner');
    }
  };

  const resetGame = async (): Promise<void> => {
    try {
      // Reset all players in database
      for (const player of gameContext.players) {
        const { error: updateError } = await supabase
          .from('game_players')
          .update({
            cards: JSON.stringify([]),
            current_bet: 0,
            is_active: true,
            is_turn: false,
            score: 0
          })
          .eq('game_id', gameContext.gameId)
          .eq('user_id', player.id);

        if (updateError) {
          console.error('Error resetting player:', updateError);
          toast.error('Failed to reset players');
          return;
        }
      }

      // Reset game state in database
      const { error: gameError } = await supabase
        .from('games')
        .update({
          status: 'waiting',
          current_player_index: 0,
          community_cards: JSON.stringify([]),
          current_bet: 0,
          pot: 0
        })
        .eq('id', gameContext.gameId);

      if (gameError) {
        console.error('Error resetting game:', gameError);
        toast.error('Failed to reset game');
        return;
      }

      // Update game context
      updateGameState(prev => ({
        ...prev,
        gameState: 'waiting',
        players: prev.players.map(player => ({
          ...player,
          cards: [],
          currentBet: 0,
          isActive: true,
          isTurn: false,
          hasActed: false,
          hasFolded: false,
          score: 0,
          lastAction: undefined
        })),
        communityCards: [],
        currentBet: 0,
        pot: 0,
        currentPlayer: 0
      }));

      toast.success('Game reset');
    } catch (error) {
      console.error('Error resetting game:', error);
      toast.error('Failed to reset game');
    }
  };

  // Helper function to generate a deck of cards
  const generateDeck = (): Card[] => {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank, faceUp: false });
      }
    }

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  };

  return {
    dealCards,
    dealCommunityCards,
    evaluateWinner,
    resetGame
  };
};

const getPositionForIndex = (index: number, totalPlayers: number) => {
  return positions[index % positions.length] as Position;
};