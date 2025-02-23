import { useEffect, useState, useCallback } from 'react';
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

export const useGameState = (roomId: string): GameStateManager => {
  const [gameContext, setGameContext] = useState<GameContext>(() => ({
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
    roomId,
    isInitialized: false,
    lastAction: undefined
  }));

  const { handleBet, handleFold } = useBettingHandler(gameContext, setGameContext);
  const { dealNextCommunityCards } = useGameLogic(gameContext, setGameContext);

  const updateGameState = useCallback((updater: (prevState: GameContext) => GameContext) => {
    setGameContext(updater);
  }, []);

  const startNewHand = useCallback(async () => {
    try {
      // Create new game in database
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

      if (createError) {
        console.error('Error creating new game:', createError);
        toast.error('Failed to create new game');
        return;
      }

      // Reset player states
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

      // Update game context
      updateGameState(prev => ({
        ...prev,
        gameId: game.id,
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
  }, [gameContext.dealerPosition, gameContext.minimumBet, gameContext.players, roomId, updateGameState]);

  const leaveGame = useCallback(async () => {
    try {
      if (gameContext.gameId) {
        // Update player status in database
        const { error: updateError } = await supabase
          .from('game_players')
          .update({ is_active: false })
          .eq('game_id', gameContext.gameId)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        if (updateError) {
          console.error('Error updating player status:', updateError);
          toast.error('Failed to leave game');
          return;
        }
      }

      // Reset game context
      updateGameState(() => ({
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
        roomId,
        isInitialized: false,
        lastAction: undefined
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
        updateGameState(prevState => ({
          ...prevState,
          pot: totalPot,
          players: prevState.players.map(player => ({
            ...player,
            hasActed: false
          }))
        }));
        void dealNextCommunityCards();
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error checking game state:', error.message);
      }
    }
  }, [gameContext.players, dealNextCommunityCards, updateGameState]);

  // Initialize game state when component mounts
  useEffect(() => {
    const initializeGame = async () => {
      try {
        console.log('Initializing game context...');
        
        // Get room configuration
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError) {
          console.error('Error fetching room:', roomError);
          toast.error('Failed to fetch room configuration');
          return;
        }

        if (!room) {
          console.error('No room found for ID:', roomId);
          toast.error('Room not found');
          return;
        }

        // Get current game data
        let { data: game, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('room_id', roomId)
          .eq('status', 'betting')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!game) {
          // Create new game if none exists
          const { data: newGame, error: createError } = await supabase
            .from('games')
            .insert([{
              room_id: roomId,
              status: 'waiting',
              current_player_index: 0,
              pot: 0,
              current_bet: room.min_bet,
              dealer_position: 0,
              community_cards: JSON.stringify([])
            }])
            .select()
            .single();

          if (createError) {
            console.error('Error creating new game:', createError);
            toast.error('Failed to create new game');
            return;
          }

          game = newGame;
        } else if (gameError) {
          console.error('Error fetching game:', gameError);
          toast.error('Failed to fetch game data');
          return;
        }

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Error getting user:', userError);
          toast.error('Failed to get user data');
          return;
        }

        if (!user) {
          console.error('No user found');
          toast.error('User not found');
          return;
        }

        // Generate bot UUIDs
        const { data: botIds, error: botError } = await supabase.rpc('generate_bot_uuids', {
          count: room.max_players - 1
        });

        if (botError) {
          console.error('Error generating bot UUIDs:', botError);
          toast.error('Failed to generate bot IDs');
          return;
        }

        if (!botIds) {
          console.error('No bot IDs generated');
          toast.error('Failed to generate bot IDs');
          return;
        }

        // Initialize players
        const positions: PlayerPosition[] = [
          'bottom', 'bottomRight', 'right', 'topRight',
          'top', 'topLeft', 'left', 'bottomLeft'
        ];

        const players = Array.from({ length: room.max_players }, (_, index) => {
          const isCurrentPlayer = index === 0;
          const playerId = isCurrentPlayer ? user?.id : botIds[index - 1];
          
          return {
            id: playerId,
            name: isCurrentPlayer ? user?.email?.split('@')[0] || 'Player' : `Bot ${index + 1}`,
            chips: 1000,
            position: positions[index % positions.length],
            cards: [],
            isActive: true,
            isTurn: index === game.current_player_index,
            currentBet: 0,
            score: 0,
            isVisible: true,
            lastAction: undefined,
            hasActed: false,
            hasFolded: false,
            stack: 1000
          } as Player;
        });

        // Check for existing players
        const { data: existingPlayers } = await supabase
          .from('game_players')
          .select('*')
          .eq('game_id', game.id);

        if (!existingPlayers || existingPlayers.length === 0) {
          // Insert new players
          const { error: playerError } = await supabase
            .from('game_players')
            .insert(players.map(player => ({
              game_id: game.id,
              user_id: player.id,
              position: player.position,
              chips: player.chips,
              current_bet: 0,
              is_active: true,
              is_turn: player.isTurn,
              cards: JSON.stringify([])
            })));

          if (playerError) {
            console.error('Error inserting players:', playerError);
            return;
          }
        } else {
          // Update players with existing data
          players.forEach((player, index) => {
            const existingPlayer = existingPlayers.find(ep => ep.position === player.position);
            if (existingPlayer) {
              players[index] = {
                ...player,
                chips: existingPlayer.chips || player.chips,
                currentBet: existingPlayer.current_bet || 0,
                isActive: existingPlayer.is_active || true,
                isTurn: existingPlayer.is_turn || false,
                cards: existingPlayer.cards ? JSON.parse(existingPlayer.cards.toString()) : [],
                score: existingPlayer.score || 0
              };
            }
          });
        }

        const parsedCommunityCards = game.community_cards ? JSON.parse(game.community_cards.toString()) : [];
        
        // Set game context
        updateGameState(() => ({
          gameId: game.id,
          players,
          gameState: game.status as GameState,
          currentBet: game.current_bet || 0,
          pot: game.pot || 0,
          rake: 0,
          dealerPosition: game.dealer_position || 0,
          currentPlayer: game.current_player_index,
          communityCards: parsedCommunityCards,
          minimumBet: room.min_bet,
          roomId: room.id,
          isInitialized: true,
          lastAction: undefined
        }));

        console.log('Game initialized successfully:', {
          gameId: game.id,
          players: players.map(p => ({
            name: p.name,
            position: p.position,
            isActive: p.isActive,
            isTurn: p.isTurn,
            chips: p.chips
          })),
          gameState: game.status
        });

      } catch (error: unknown) {
        if (error instanceof PostgrestError) {
          console.error('Database error initializing game:', error.message);
        } else if (error instanceof Error) {
          console.error('Error initializing game:', error.message);
        } else {
          console.error('Unknown error initializing game:', error);
        }
        toast.error('Failed to initialize game');
      }
    };

    void initializeGame();
  }, [roomId, updateGameState]);

  // Subscribe to game updates
  useEffect(() => {
    if (!gameContext.gameId) return;

    const gameSubscription = supabase
      .channel(`game_${gameContext.gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameContext.gameId}`
        },
        async (payload: GameSubscriptionPayload) => {
          try {
            console.log('Game update received:', payload);
            const newGameState = payload.new;

            if (!newGameState) return;

            // Parse community cards with type safety
            let parsedCommunityCards: Card[] = [];
            if (newGameState.community_cards) {
              try {
                const parsed = JSON.parse(newGameState.community_cards.toString());
                if (Array.isArray(parsed)) {
                  parsedCommunityCards = parsed as Card[];
                }
              } catch (parseError) {
                console.error('Error parsing community cards:', parseError);
              }
            }

            // Update game context with new state
            updateGameState(prev => ({
              ...prev,
              gameId: newGameState.id,
              gameState: newGameState.status as GameState,
              currentBet: newGameState.current_bet || 0,
              pot: newGameState.pot || 0,
              rake: newGameState.rake || 0,
              dealerPosition: newGameState.dealer_position || 0,
              currentPlayer: newGameState.current_player_index,
              communityCards: parsedCommunityCards
            }));
          } catch (error: unknown) {
            if (error instanceof Error) {
              console.error('Error handling game update:', error.message);
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.channel(`game_${gameContext.gameId}`).unsubscribe();
    };
  }, [gameContext.gameId, updateGameState]);

  // Add subscription for player updates
  useEffect(() => {
    if (!gameContext.gameId) return;

    const playerSubscription = supabase
      .channel(`players_${gameContext.gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameContext.gameId}`
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
          } catch (error: unknown) {
            if (error instanceof Error) {
              console.error('Error handling player update:', error.message);
            }
          }
        }
      )
      .subscribe();

    return () => {
      void playerSubscription.unsubscribe();
    };
  }, [gameContext.gameId, updateGameState]);

  const getPositionForIndex = useCallback((index: number, totalPlayers: number): PlayerPosition => {
    const positions: PlayerPosition[] = [
      'bottom',
      'bottomRight',
      'right',
      'topRight',
      'top',
      'topLeft',
      'left',
      'bottomLeft',
      'leftTop',
      'leftBottom'
    ];

    // For 9 players (8 bots + 1 player), use all positions except leftBottom
    if (totalPlayers === 9) {
      const ninePlayerPositions: PlayerPosition[] = [
        'bottom',
        'bottomRight',
        'right',
        'topRight',
        'top',
        'topLeft',
        'left',
        'bottomLeft',
        'leftTop'
      ];
      return ninePlayerPositions[index];
    }

    // For 8 players, use the main positions
    if (totalPlayers === 8) {
      const eightPlayerPositions: PlayerPosition[] = [
        'bottom',
        'bottomRight',
        'right',
        'topRight',
        'top',
        'topLeft',
        'left',
        'bottomLeft'
      ];
      return eightPlayerPositions[index];
    }

    // For less than 8 players, distribute them evenly
    const mainPositions: PlayerPosition[] = [
      'bottom',
      'bottomRight',
      'right',
      'topRight',
      'top',
      'topLeft',
      'left',
      'bottomLeft'
    ];

    const spacing = Math.floor(mainPositions.length / totalPlayers);
    const offset = Math.floor((mainPositions.length - (totalPlayers * spacing)) / 2);
    return mainPositions[(index * spacing + offset) % mainPositions.length];
  }, []);

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
        dealNextCommunityCards().catch(error => {
          console.error('Error dealing community cards:', error);
          toast.error('Failed to deal community cards');
        });
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
