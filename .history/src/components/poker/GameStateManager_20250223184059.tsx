import { useEffect, useState } from 'react';
import { GameContext, Player, PlayerPosition, Card, GameState } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGameLogic } from './GameLogic';
import { useBettingHandler } from './BettingHandler';
import { RealtimeChannel } from '@supabase/supabase-js';

interface GameRow {
  id: string;
  room_id: string;
  status: string;
  current_player_index: number;
  pot: number;
  current_bet: number;
  dealer_position: number;
  community_cards: string;
  rake: number;
  created_at: string;
  updated_at: string;
}

interface GamePlayerRow {
  id: string;
  game_id: string;
  user_id: string;
  position: string;
  chips: number;
  current_bet: number;
  is_active: boolean;
  is_turn: boolean;
  cards: string;
  score: number;
}

// Ensure checkGameState is defined or imported
const checkGameState = () => {
  // Implement check game state logic here
};

const handleOpponentAction = (currentPlayer, gameContext, handleBet, handleFold) => {
  // Implement opponent action logic here
};

const useGameState = (roomId: string) => {
  const [gameContext, setGameContext] = useState<GameContext>({
    players: [],
    pot: 0,
    rake: 0,
    communityCards: [],
    currentPlayer: 0,
    gameState: "waiting",
    minimumBet: 20,
    currentBet: 0,
    dealerPosition: 0,
    roomId,
    isInitialized: false
  });

  const { handleBet, handleFold } = useBettingHandler(gameContext, setGameContext);
  const { dealNextCommunityCards } = useGameLogic(gameContext, setGameContext);

  // Initialize game state when component mounts
  useEffect(() => {
    const initializeGame = async (roomId: string, gameId?: string) => {
      try {
        console.log('Initializing game context...');
        
        // If we have a gameId, set it immediately in the context
        if (gameId) {
          setGameContext(prevContext => ({
            ...prevContext,
            gameId,
          }));
        }

        // Get room configuration
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError) {
          console.error('Error fetching room:', roomError);
          return;
        }

        // Get current game data
        const { data: game, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq(gameId ? 'id' : 'room_id', gameId || roomId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (gameError) {
          console.error('Error fetching game:', gameError);
          return;
        }

        if (!game) {
          console.error('No game found for room:', roomId);
          return;
        }

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Error getting user:', userError);
          return;
        }

        // Generate bot UUIDs
        const { data: botIds, error: botError } = await supabase.rpc('generate_bot_uuids', {
          count: room.max_players - 1
        });

        if (botError) {
          console.error('Error generating bot UUIDs:', botError);
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
            lastAction: undefined
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
        setGameContext({
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
        });

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

      } catch (error) {
        console.error('Error initializing game:', error);
      }
    };

    initializeGame(roomId);
  }, [roomId, checkGameState]);

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
        async (payload: { new: GameRow }) => {
          console.log('Game update received:', payload);
          const newGameState = payload.new;

          if (!newGameState) return;

          // Parse community cards
          const parsedCommunityCards = newGameState.community_cards
            ? JSON.parse(newGameState.community_cards)
            : [];

          // Update game context with new state
          setGameContext(prev => ({
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
        }
      )
      .subscribe();

    return () => {
      supabase.channel(`game_${gameContext.gameId}`).unsubscribe();
    };
  }, [gameContext.gameId, setGameContext]);

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
        async (payload: { new: GamePlayerRow }) => {
          console.log('Player update received:', payload);
          const updatedPlayer = payload.new;

          if (!updatedPlayer) return;

          // Parse player cards
          const parsedCards = updatedPlayer.cards
            ? JSON.parse(updatedPlayer.cards)
            : [];

          // Update player in game context
          setGameContext(prev => {
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
        }
      )
      .subscribe();

    return () => {
      playerSubscription.unsubscribe();
    };
  }, [gameContext.gameId, setGameContext]);

  const getPositionForIndex = (index: number, totalPlayers: number): PlayerPosition => {
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
  };

  const checkGameState = () => {
    const allPlayersActed = gameContext.players.every(player => 
      !player.isActive || player.currentBet === gameContext.currentBet
    );

    // Calculate total pot from player bets
    const totalPot = gameContext.players.reduce((sum, player) => sum + (player.currentBet || 0), 0);

    // Update game state with calculated pot
    setGameContext(prev => ({
      ...prev,
      pot: totalPot
    }));

    console.log('Game state check:', {
      allPlayersActed,
      activePlayers: gameContext.players.filter(p => p.isActive).length,
      currentBet: gameContext.currentBet,
      totalPot,
      playerBets: gameContext.players.map(p => ({
        name: p.name,
        bet: p.currentBet,
        isActive: p.isActive
      }))
    });

    if (allPlayersActed) {
      console.log('All players have acted, dealing next community cards');
      dealNextCommunityCards();
    } else {
      console.log('Not all players have acted yet, waiting for actions.');
    }
  };

  useEffect(() => {
    checkGameState();
  }, [gameContext.players, gameContext.currentBet]);

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
  }, [gameContext.currentPlayer, gameContext.gameId, gameContext.gameState, gameContext.players, handleBet, handleFold, checkGameState]);

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
  }, [gameContext.players, gameContext.currentBet, gameContext.communityCards, gameContext.gameId, gameContext.gameState, dealNextCommunityCards, checkGameState]);

  return { gameContext, setGameContext };
};
