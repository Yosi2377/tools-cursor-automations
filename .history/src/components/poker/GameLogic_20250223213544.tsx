import { useCallback, useMemo } from 'react';
import { GameContext, Player, Card, PlayerPosition } from '@/types/poker';
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
  dealNextCommunityCards: (count: number) => Card[];
}

const getPositionForIndex = (index: number, totalPlayers: number): PlayerPosition => {
  const positions: PlayerPosition[] = [
    'bottom', 'bottomRight', 'right', 'topRight',
    'top', 'topLeft', 'left', 'bottomLeft'
  ];
  return positions[index % positions.length];
};

const generateDeck = (): Card[] => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, faceUp: false });
    }
  }

  return shuffleDeck(deck);
};

const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const useGameLogic = (
  gameContext: GameContext,
  updateGameState: (updater: (prevState: GameContext) => GameContext) => void
): GameLogicHook => {
  const cardDealing = useCardDealing();
  const { dealNextCommunityCards } = cardDealing;

  const dealCards = useCallback(async (): Promise<void> => {
    if (!gameContext.gameId) {
      toast.error('No game ID found');
      return;
    }

    try {
      const deck = generateDeck();
      const updatedPlayers = gameContext.players.map((player, index) => {
        if (!player.isActive) return player;

        const cards = [deck.pop()!, deck.pop()!].map(card => ({
          ...card,
          faceUp: player.position === 'bottom'
        }));
        return { ...player, cards };
      });

      await Promise.all(updatedPlayers.map(async player => {
        if (!player.isActive) return;

        const { error } = await supabase
          .from('game_players')
          .update({
            cards: JSON.stringify(player.cards),
            is_active: true
          })
          .eq('game_id', gameContext.gameId)
          .eq('user_id', player.id);

        if (error) throw error;
      }));

      updateGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        gameState: 'betting'
      }));

      toast.success('Cards dealt successfully');
    } catch (error) {
      console.error('Error dealing cards:', error);
      toast.error('Failed to deal cards');
    }
  }, [gameContext.gameId, gameContext.players, updateGameState]);

  const dealCommunityCards = useCallback(async (): Promise<void> => {
    if (!gameContext.gameId) {
      toast.error('No game ID found');
      return;
    }

    try {
      const currentCount = gameContext.communityCards.length;
      const deck = generateDeck();
      let newCards: Card[] = [];

      if (currentCount === 0) {
        newCards = deck.slice(0, 3); // Flop
      } else if (currentCount === 3) {
        newCards = [deck[0]]; // Turn
      } else if (currentCount === 4) {
        newCards = [deck[0]]; // River
      }

      if (newCards.length === 0) return;

      const updatedCommunityCards = [...gameContext.communityCards, ...newCards];

      await Promise.all([
        supabase
          .from('games')
          .update({
            community_cards: JSON.stringify(updatedCommunityCards),
            current_bet: 0
          })
          .eq('id', gameContext.gameId),
        supabase
          .from('game_players')
          .update({
            current_bet: 0,
            has_acted: false
          })
          .eq('game_id', gameContext.gameId)
      ]);

      updateGameState(prev => ({
        ...prev,
        communityCards: updatedCommunityCards,
        currentBet: 0,
        players: prev.players.map(p => ({
          ...p,
          currentBet: 0,
          hasActed: false
        }))
      }));

      const stage = currentCount === 0 ? 'Flop' : currentCount === 3 ? 'Turn' : 'River';
      toast.success(`${stage} dealt!`);
    } catch (error) {
      console.error('Error dealing community cards:', error);
      toast.error('Failed to deal community cards');
    }
  }, [gameContext.gameId, gameContext.communityCards, updateGameState]);

  const startNewHand = useCallback(async () => {
    try {
      const nextDealerIndex = (gameContext.dealerPosition + 1) % gameContext.players.length;
      const firstPlayerIndex = (nextDealerIndex + 1) % gameContext.players.length;

      const { data: newGame, error: gameError } = await supabase
        .from('games')
        .insert({
          room_id: gameContext.roomId,
          status: 'betting',
          current_player_index: firstPlayerIndex,
          pot: 0,
          current_bet: gameContext.minimumBet,
          dealer_position: nextDealerIndex,
          community_cards: JSON.stringify([])
        })
        .select()
        .single();

      if (gameError) throw gameError;
      if (!newGame) throw new Error('Failed to create new game');

      const updatedPlayers = gameContext.players.map((player, index) => ({
        ...player,
        cards: [],
        currentBet: 0,
        hasActed: false,
        hasFolded: false,
        isActive: true,
        isTurn: index === firstPlayerIndex,
        lastAction: undefined
      }));

      await supabase
        .from('game_players')
        .upsert(
          updatedPlayers.map(p => ({
            game_id: newGame.id,
            user_id: p.id,
            position: p.position,
            cards: JSON.stringify([]),
            is_turn: p.isTurn,
            is_active: true,
            current_bet: 0,
            chips: p.chips
          }))
        );

      updateGameState(prev => ({
        ...prev,
        gameId: newGame.id,
        players: updatedPlayers,
        gameState: 'betting',
        currentPlayer: firstPlayerIndex,
        communityCards: [],
        pot: 0,
        currentBet: prev.minimumBet,
        dealerPosition: nextDealerIndex
      }));

      await dealCards();
      toast.success('New hand started!');
    } catch (error) {
      console.error('Error starting new hand:', error);
      toast.error('Failed to start new hand');
    }
  }, [gameContext.dealerPosition, gameContext.players.length, gameContext.roomId, gameContext.minimumBet, dealCards, updateGameState]);

  const evaluateWinner = useCallback(async (): Promise<void> => {
    try {
      const activePlayers = gameContext.players.filter(p => !p.hasFolded);
      if (activePlayers.length === 0) {
        toast.error('No active players');
        return;
      }

      const playerScores = activePlayers.map(player => ({
        player,
        score: evaluateHand([...player.cards, ...gameContext.communityCards])
      }));

      const maxScore = Math.max(...playerScores.map(ps => ps.score));
      const winners = playerScores.filter(ps => ps.score === maxScore).map(ps => ps.player);
      const totalPot = gameContext.players.reduce((sum, p) => sum + (p.currentBet || 0), 0);
      const winAmount = Math.floor(totalPot / winners.length);

      await Promise.all([
        ...winners.map(winner =>
          supabase
            .from('game_players')
            .update({
              chips: winner.chips + winAmount,
              score: maxScore
            })
            .eq('game_id', gameContext.gameId)
            .eq('user_id', winner.id)
        ),
        supabase
          .from('games')
          .update({
            status: 'complete',
            winner_id: winners[0].id
          })
          .eq('id', gameContext.gameId)
      ]);

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
  }, [gameContext.gameId, gameContext.players, gameContext.communityCards, updateGameState]);

  const resetGame = useCallback(async (): Promise<void> => {
    if (!gameContext.gameId) return;

    try {
      await Promise.all([
        supabase
          .from('games')
          .update({
            status: 'complete',
            community_cards: JSON.stringify([]),
            pot: 0,
            current_bet: 0
          })
          .eq('id', gameContext.gameId),
        supabase
          .from('game_players')
          .update({
            cards: JSON.stringify([]),
            current_bet: 0,
            is_active: true,
            is_turn: false
          })
          .eq('game_id', gameContext.gameId)
      ]);

      updateGameState(prev => ({
        ...prev,
        players: prev.players.map(p => ({
          ...p,
          cards: [],
          currentBet: 0,
          hasActed: false,
          hasFolded: false,
          isActive: true,
          isTurn: false,
          lastAction: undefined
        })),
        gameState: 'waiting',
        communityCards: [],
        pot: 0,
        currentBet: 0
      }));

      toast.success('Game reset successfully');
    } catch (error) {
      console.error('Error resetting game:', error);
      toast.error('Failed to reset game');
    }
  }, [gameContext.gameId, updateGameState]);

  return {
    dealCards,
    dealCommunityCards,
    evaluateWinner,
    resetGame,
    startNewHand,
    dealNextCommunityCards
  };
};