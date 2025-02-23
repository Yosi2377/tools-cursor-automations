import { GameContext, Player, Card } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { evaluateHand } from '@/utils/pokerLogic';
import { useCardDealing } from './CardDealing';

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

export interface GameLogicHook {
  dealCards: () => Promise<void>;
  dealCommunityCards: () => Promise<void>;
  evaluateWinner: () => Promise<void>;
  resetGame: () => Promise<void>;
  startNewHand: () => Promise<void>;
}

const getPositionForIndex = (index: number, totalPlayers: number): string => {
  return ((index + 1) % totalPlayers).toString();
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

export const useGameLogic = (
  gameContext: GameContext,
  updateGameState: (updater: (prevState: GameContext) => GameContext) => void
): GameLogicHook => {
  const cardDealing = useCardDealing();

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
      let newCards: Card[];
      let nextGameState: 'betting' | 'showdown' = 'betting';
      
      if (gameContext.communityCards.length === 0) {
        // Deal flop
        newCards = cardDealing.dealCommunityCards(3);
      } else if (gameContext.communityCards.length === 3) {
        // Deal turn
        newCards = cardDealing.dealCommunityCards(1);
      } else if (gameContext.communityCards.length === 4) {
        // Deal river
        newCards = cardDealing.dealCommunityCards(1);
      } else if (gameContext.communityCards.length === 5) {
        // All cards dealt, move to showdown
        nextGameState = 'showdown';
        newCards = [];
      } else {
        console.error('Invalid community cards state');
        toast.error('Invalid game state');
        return;
      }

      const updatedCommunityCards = [...gameContext.communityCards, ...newCards];

      // Update game state in database
      const { error: updateError } = await supabase
        .from('games')
        .update({
          community_cards: JSON.stringify(updatedCommunityCards),
          current_player_index: (gameContext.dealerPosition + 1) % gameContext.players.length,
          status: nextGameState,
          current_bet: 0
        })
        .eq('id', gameContext.gameId);

      if (updateError) {
        console.error('Error updating community cards:', updateError);
        toast.error('Failed to deal community cards');
        return;
      }

      // Reset player states for new betting round
      const activePlayers = gameContext.players.filter(p => !p.hasFolded);
      const firstActivePlayerIndex = gameContext.players.findIndex(p => p === activePlayers[0]);
      
      for (const player of activePlayers) {
        const { error: playerError } = await supabase
          .from('game_players')
          .update({
            is_turn: player.position === activePlayers[0].position,
            current_bet: 0,
            has_acted: false
          })
          .eq('game_id', gameContext.gameId)
          .eq('user_id', player.id);

        if (playerError) {
          console.error('Error resetting player state:', playerError);
          toast.error('Failed to reset player states');
          return;
        }
      }

      // Update game context
      updateGameState(prev => ({
        ...prev,
        gameState: nextGameState,
        communityCards: updatedCommunityCards,
        currentBet: 0,
        players: prev.players.map(player => ({
          ...player,
          currentBet: 0,
          hasActed: false,
          isTurn: !player.hasFolded && player === activePlayers[0]
        })),
        currentPlayer: firstActivePlayerIndex
      }));

      if (nextGameState === 'betting') {
        toast.success('Community cards dealt - New betting round');
      } else {
        toast.success('All community cards dealt - Showdown!');
      }
    } catch (error) {
      console.error('Error dealing community cards:', error);
      toast.error('Failed to deal community cards');
    }
  };

  const startNewHand = async () => {
    const currentDealerIndex = gameContext.dealerPosition;
    const nextDealerIndex = (currentDealerIndex + 1) % gameContext.players.length;
    
    await dealCards();
    const firstPlayerIndex = (nextDealerIndex + 1) % gameContext.players.length;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create new game first
      const { data: newGame, error: gameCreateError } = await supabase
        .from('games')
        .insert({
          status: 'betting',
          current_player_index: firstPlayerIndex,
          community_cards: [],
          pot: 0,
          rake: 0,
          current_bet: gameContext.minimumBet,
          dealer_position: nextDealerIndex,
          room_id: gameContext.roomId
        })
        .select()
        .single();

      if (gameCreateError) throw gameCreateError;
      if (!newGame) throw new Error('Failed to create new game');

      // Update players in Supabase
      const { error: playersError } = await supabase
        .from('game_players')
        .upsert(
          gameContext.players.map((p, index) => ({
            game_id: newGame.id,
            user_id: user.id,
            position: getPositionForIndex(index, gameContext.players.length),
            cards: JSON.stringify(p.cards),
            is_turn: index === firstPlayerIndex,
            is_active: true,
            current_bet: 0,
            chips: p.chips
          }))
        );

      if (playersError) throw playersError;

      updateGameState(prev => ({
        ...prev,
        players: prev.players.map((p, i) => ({ 
          ...p,
          isTurn: i === firstPlayerIndex,
          isActive: true,
          currentBet: 0
        })),
        gameState: "betting",
        currentPlayer: firstPlayerIndex,
        communityCards: [],
        pot: 0,
        rake: 0,
        currentBet: prev.minimumBet,
        dealerPosition: nextDealerIndex,
        gameId: newGame.id
      }));

      toast.success("New hand started");

    } catch (error) {
      console.error('Error starting new hand:', error);
      toast.error("Failed to start new hand");
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

  return {
    dealCards,
    dealCommunityCards,
    evaluateWinner,
    resetGame,
    startNewHand
  };
};