import { useCallback, useRef } from 'react';
import { GameContext, Player, Card, PlayerPosition } from '@/types/poker';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
  const { dealNextCommunityCards } = useCardDealing();
  const prevGameContextRef = useRef<GameContext>(gameContext);

  const startNewHand = useCallback(async () => {
    if (!gameContext.gameId || !gameContext.roomId) {
      toast.error('Invalid game state');
      return;
    }

    try {
      const currentDealerIndex = gameContext.dealerPosition;
      const nextDealerIndex = (currentDealerIndex + 1) % gameContext.players.length;
      const firstPlayerIndex = (nextDealerIndex + 1) % gameContext.players.length;

      // Create new game first
      const { data: newGame, error: gameCreateError } = await supabase
        .from('games')
        .insert({
          status: 'betting',
          current_player_index: firstPlayerIndex,
          community_cards: '[]',
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

      // Deal cards to players
      const updatedPlayers = gameContext.players.map(player => ({
        ...player,
        cards: [
          dealNextCommunityCards(1)[0],
          dealNextCommunityCards(1)[0]
        ],
        currentBet: 0,
        hasActed: false,
        hasFolded: false,
        isActive: true,
        isTurn: false
      }));

      // Update players in database
      const { error: playersError } = await supabase
        .from('game_players')
        .upsert(
          updatedPlayers.map((p, index) => ({
            game_id: newGame.id,
            user_id: p.id,
            position: p.position,
            cards: JSON.stringify(p.cards),
            is_turn: index === firstPlayerIndex,
            is_active: true,
            current_bet: 0,
            chips: p.chips
          }))
        );

      if (playersError) throw playersError;

      // Only update state if game context has changed
      if (JSON.stringify(gameContext) !== JSON.stringify(prevGameContextRef.current)) {
        updateGameState(prev => ({
          ...prev,
          players: updatedPlayers.map((p, i) => ({
            ...p,
            isTurn: i === firstPlayerIndex
          })),
          gameState: 'betting',
          currentPlayer: firstPlayerIndex,
          communityCards: [],
          pot: 0,
          rake: 0,
          currentBet: prev.minimumBet,
          dealerPosition: nextDealerIndex,
          gameId: newGame.id
        }));
        prevGameContextRef.current = gameContext;
      }

      toast.success('New hand started');
    } catch (error) {
      console.error('Error starting new hand:', error);
      toast.error('Failed to start new hand');
    }
  }, [gameContext, updateGameState, dealNextCommunityCards]);

  const dealCommunityCards = useCallback(async () => {
    if (!gameContext.gameId) {
      toast.error('No active game');
      return;
    }

    try {
      const currentCount = gameContext.communityCards.length;
      let newCards: Card[] = [];
      let stage = '';

      if (currentCount === 0) {
        newCards = dealNextCommunityCards(3); // Flop
        stage = 'Flop';
      } else if (currentCount === 3) {
        newCards = dealNextCommunityCards(1); // Turn
        stage = 'Turn';
      } else if (currentCount === 4) {
        newCards = dealNextCommunityCards(1); // River
        stage = 'River';
      }

      if (newCards.length > 0) {
        const updatedCommunityCards = [...gameContext.communityCards, ...newCards];

        // Update game in database
        const { error: updateError } = await supabase
          .from('games')
          .update({
            community_cards: JSON.stringify(updatedCommunityCards),
            current_bet: 0,
            current_player_index: (gameContext.dealerPosition + 1) % gameContext.players.length
          })
          .eq('id', gameContext.gameId);

        if (updateError) throw updateError;

        // Reset player bets in database
        const { error: playersError } = await supabase
          .from('game_players')
          .update({ current_bet: 0 })
          .eq('game_id', gameContext.gameId);

        if (playersError) throw playersError;

        // Only update state if game context has changed
        if (JSON.stringify(gameContext) !== JSON.stringify(prevGameContextRef.current)) {
          updateGameState(prev => ({
            ...prev,
            communityCards: updatedCommunityCards,
            currentBet: 0,
            players: prev.players.map(p => ({ ...p, currentBet: 0 })),
            currentPlayer: (prev.dealerPosition + 1) % prev.players.length
          }));
          prevGameContextRef.current = gameContext;
        }

        toast.success(`${stage} dealt!`);
      }
    } catch (error) {
      console.error('Error dealing community cards:', error);
      toast.error('Failed to deal community cards');
    }
  }, [gameContext, updateGameState, dealNextCommunityCards]);

  return {
    startNewHand,
    dealCommunityCards,
    dealCards: startNewHand,
    evaluateWinner: async () => {},
    resetGame: async () => {},
    dealNextCommunityCards
  };
};