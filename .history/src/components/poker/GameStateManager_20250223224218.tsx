import { useEffect, useState, useCallback, useRef } from 'react';
import { GameContext, Player, PlayerPosition, Card, GameState, GameRow, GamePlayerRow } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useGameLogic } from './GameLogic';
import { useBettingHandler } from './BettingHandler';
import { handleOpponentAction } from '@/utils/opponentBehavior';
import { initialGameState } from '@/utils/gameInitializer';

interface GameSubscriptionPayload {
  new: GameRow;
}

interface PlayerSubscriptionPayload {
  new: GamePlayerRow;
}

interface GameStateManager {
  gameContext: GameContext;
  updateGameState: (updater: (prevState: GameContext) => GameContext) => void;
  startNewHand: () => Promise<void>;
  leaveGame: () => Promise<void>;
}

const INITIAL_GAME_STATE: GameContext = {
  gameId: '',
  players: [],
  gameState: 'waiting',
  currentBet: 0,
  pot: 0,
  rake: 0,
  dealerPosition: 0,
  currentPlayer: 0,
  communityCards: [],
  minimumBet: 10,
  roomId: '',
  isInitialized: false,
  lastAction: undefined
};

export const useGameState = (roomId: string): GameStateManager => {
  const [gameContext, setGameContext] = useState<GameContext>(() => ({
    ...INITIAL_GAME_STATE,
    roomId
  }));

  const isInitializing = useRef(false);
  const gameSubscription = useRef<ReturnType<typeof supabase.channel>>();
  const prevGameContext = useRef<GameContext>(gameContext);

  const { handleBet, handleFold } = useBettingHandler(gameContext, setGameContext);
  const { dealNextCommunityCards } = useGameLogic(gameContext, setGameContext);

  const updateGameState = useCallback((updater: (prevState: GameContext) => GameContext) => {
    setGameContext(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      
      // Only update if something actually changed
      if (JSON.stringify(prev) === JSON.stringify(next)) {
        return prev;
      }
      
      prevGameContext.current = next;
      return next;
    });
  }, []);

  const startNewHand = useCallback(async () => {
    if (!gameContext.isInitialized) return;

    try {
      const { data: game, error: createError } = await supabase
        .from('games')
        .insert([{
          room_id: roomId,
          status: 'waiting',
          current_player_index: 0,
          pot: 0,
          current_bet: gameContext.minimumBet,
          dealer_position: (gameContext.dealerPosition + 1) % gameContext.players.length,
          community_cards: JSON.stringify([])
        }])
        .select()
        .single();

      if (createError) throw createError;

      const resetPlayers = gameContext.players.map(player => ({
        ...player,
        cards: [],
        currentBet: 0,
        hasActed: false,
        hasFolded: false,
        lastAction: undefined,
        isActive: true,
        isTurn: false
      }));

      updateGameState(prev => ({
        ...prev,
        gameId: String(game.id),
        players: resetPlayers,
        gameState: 'waiting',
        currentBet: 0,
        pot: 0,
        dealerPosition: game.dealer_position,
        currentPlayer: 0,
        communityCards: [],
        lastAction: undefined
      }));

      toast.success('New hand started');
    } catch (error) {
      console.error('Error starting new hand:', error);
      toast.error('Failed to start new hand');
    }
  }, [gameContext.isInitialized, gameContext.minimumBet, gameContext.dealerPosition, gameContext.players.length, roomId, updateGameState]);

  const leaveGame = useCallback(async () => {
    try {
      if (gameContext.gameId) {
        const { error: updateError } = await supabase
          .from('game_players')
          .update({ is_active: false })
          .eq('game_id', gameContext.gameId)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        if (updateError) throw updateError;
      }

      updateGameState(() => ({
        ...INITIAL_GAME_STATE,
        roomId
      }));

      toast.success('Left game successfully');
    } catch (error) {
      console.error('Error leaving game:', error);
      toast.error('Failed to leave game');
    }
  }, [gameContext.gameId, roomId, updateGameState]);

  const checkGameState = useCallback((): void => {
    try {
      const allPlayersActed = gameContext.players.every((player: Player) => 
        player.hasFolded || player.hasActed || player.stack === 0
      );
      
      if (allPlayersActed) {
        const totalPot = gameContext.players.reduce((sum, player) => sum + player.currentBet, 0);
        
        // Only update if pot or player states have changed
        if (totalPot !== gameContext.pot || gameContext.players.some(p => p.hasActed)) {
          updateGameState(prevState => ({
            ...prevState,
            pot: totalPot,
            players: prevState.players.map(player => ({
              ...player,
              hasActed: false
            }))
          }));
        }

        // Determine how many cards to deal based on current community cards
        const currentCount = gameContext.communityCards.length;
        if (currentCount === 0) {
          dealNextCommunityCards(3); // Deal flop
        } else if (currentCount === 3 || currentCount === 4) {
          dealNextCommunityCards(1); // Deal turn or river
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error checking game state:', error.message);
      }
    }
  }, [gameContext.players, gameContext.communityCards.length, gameContext.pot, dealNextCommunityCards, updateGameState]);

  // Initialize game state
  useEffect(() => {
    const initializeGame = async () => {
      if (isInitializing.current || gameContext.isInitialized) return;
      isInitializing.current = true;

      try {
        const { data: game, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('status', 'betting')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (gameError) {
          toast.error('Error fetching game data');
          console.error(gameError);
          return;
        }

        if (!game) {
          toast.error('No active game found');
          return;
        }

        const currentGameContext: GameContext = {
          gameId: String(game.id),
          roomId: String(game.room_id),
          players: [], // Initialize players as empty
          gameState: game.status as GameState,
          currentBet: game.current_bet,
          pot: game.pot,
          rake: 0,
          dealerPosition: game.dealer_position,
          currentPlayer: game.current_player_index,
          communityCards: JSON.parse(game.community_cards || '[]') as Card[],
          minimumBet: 10,
          isInitialized: true,
          lastAction: undefined
        };

        setGameContext(currentGameContext);

        // Subscribe to game updates
        const gameChannel = supabase.channel(`game:${String(game.id)}`);
        
        gameChannel
          .on(
            'postgres_changes' as const,
            {
              event: '*',
              schema: 'public',
              table: 'games',
              filter: `id=eq.${String(game.id)}`
            },
            (payload: { new: GameRow }) => {
              const newGame = payload.new;
              // Only update if something changed
              if (
                newGame.status !== prevGameContext.current.gameState ||
                newGame.current_bet !== prevGameContext.current.currentBet ||
                newGame.pot !== prevGameContext.current.pot ||
                newGame.dealer_position !== prevGameContext.current.dealerPosition ||
                newGame.current_player_index !== prevGameContext.current.currentPlayer ||
                JSON.stringify(JSON.parse(newGame.community_cards || '[]')) !== JSON.stringify(prevGameContext.current.communityCards)
              ) {
                updateGameState(prev => ({
                  ...prev,
                  gameState: newGame.status as GameState,
                  currentBet: newGame.current_bet,
                  pot: newGame.pot,
                  dealerPosition: newGame.dealer_position,
                  currentPlayer: newGame.current_player_index,
                  communityCards: JSON.parse(newGame.community_cards || '[]') as Card[],
                }));
              }
            }
          )
          .subscribe();

        gameSubscription.current = gameChannel;

      } catch (error) {
        console.error('Error initializing game:', error);
        toast.error('Failed to initialize game');
        isInitializing.current = false;
      }
    };

    initializeGame();

    return () => {
      if (gameSubscription.current) {
        gameSubscription.current.unsubscribe();
      }
    };
  }, [roomId, updateGameState, gameContext.isInitialized]);

  // Add subscription for player updates
  useEffect(() => {
    if (!gameContext.gameId) return;

    const playerSubscription = supabase
      .channel(`players_${String(gameContext.gameId)}`)
      .on(
        'postgres_changes' as const,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${String(gameContext.gameId)}`
        },
        async (payload: PlayerSubscriptionPayload) => {
          try {
            console.log('Player update received:', payload);
            const updatedPlayer = payload.new;

            if (!updatedPlayer) return;

            // Parse player cards with type safety
            let parsedCards: Card[] = [];
            if (updatedPlayer.cards) {
              try {
                const parsed = JSON.parse(updatedPlayer.cards.toString());
                if (Array.isArray(parsed)) {
                  parsedCards = parsed as Card[];
                }
              } catch (parseError) {
                console.error('Error parsing player cards:', parseError);
              }
            }

            // Update player in game context
            updateGameState(prev => {
              const updatedPlayers = prev.players.map(player =>
                player.position === updatedPlayer.position
                  ? {
                      ...player,
                      chips: updatedPlayer.chips || player.chips,
                      currentBet: updatedPlayer.current_bet || 0,
                      isActive: updatedPlayer.is_active || false,
                      isTurn: updatedPlayer.is_turn || false,
                      cards: parsedCards,
                      score: updatedPlayer.score || 0
                    }
                  : player
              );

              return {
                ...prev,
                players: updatedPlayers
              };
            });
          } catch (error) {
            console.error('Error handling player update:', error);
          }
        }
      )
      .subscribe();

    return () => {
      void playerSubscription.unsubscribe();
    };
  }, [gameContext.gameId, updateGameState]);

  const getPositionForIndex = (index: number, totalPlayers: number): PlayerPosition => {
    const positions: PlayerPosition[] = [
      'bottom',
      'bottomRight',
      'right',
      'topRight',
      'top',
      'topLeft',
      'left',
      'bottomLeft'
    ];

    // For 9 players (8 bots + 1 player), use all positions
    if (totalPlayers === 9) {
      return positions[index % positions.length];
    }

    // For 6 players, use a subset of positions
    if (totalPlayers === 6) {
      const sixPlayerPositions: PlayerPosition[] = [
        'bottom',
        'bottomRight',
        'topRight',
        'top',
        'topLeft',
        'bottomLeft'
      ];
      return sixPlayerPositions[index % sixPlayerPositions.length];
    }

    // Default to 8 positions
    return positions[index % positions.length];
  };

  // Check game state when players or current bet changes
  useEffect(() => {
    checkGameState();
  }, [checkGameState]);

  // Handle bot actions
  useEffect(() => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    if (currentPlayer?.name.startsWith('Bot') && currentPlayer.isTurn && currentPlayer.isActive) {
      console.log('Bot turn detected:', currentPlayer.name);
      const timer = setTimeout(() => {
        handleOpponentAction(
          currentPlayer,
          gameContext,
          handleBet,
          handleFold
        );
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [gameContext, handleBet, handleFold]);

  // Check for community cards update
  useEffect(() => {
    if (!gameContext.gameId || gameContext.gameState !== 'betting') {
      console.log('No game ID in context or not in betting state, skipping community card check');
      return;
    }

    const activePlayers = gameContext.players.filter(p => p.isActive);
    const allPlayersActed = activePlayers.every(p =>
      !p.isActive || p.currentBet === gameContext.currentBet
    );

    console.log('Checking community cards:', {
      activePlayers: activePlayers.length,
      allPlayersActed,
      currentCommunityCards: gameContext.communityCards.length,
      playerBets: activePlayers.map(p => ({
        name: p.name,
        bet: p.currentBet,
        isActive: p.isActive,
        isTurn: p.isTurn
      })),
      currentBet: gameContext.currentBet,
      gameState: gameContext.gameState
    });

    if (allPlayersActed && activePlayers.filter(p => p.isActive).length > 1) {
      console.log('All players have acted, dealing next community cards');
      const timer = setTimeout(() => {
        const currentCount = gameContext.communityCards.length;
        if (currentCount === 0) {
          dealNextCommunityCards(3); // Deal flop
        } else if (currentCount === 3 || currentCount === 4) {
          dealNextCommunityCards(1); // Deal turn or river
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameContext, dealNextCommunityCards]);

  return {
    gameContext,
    updateGameState,
    startNewHand,
    leaveGame
  };
};
