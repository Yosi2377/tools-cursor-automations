import { useEffect, useState } from 'react';
import { GameContext, Player, PlayerPosition, Card, GameState } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGameLogic } from './GameLogic';

export const useGameState = (roomId: string) => {
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
  }, [roomId]);

  // Subscribe to game updates
  useEffect(() => {
    if (!gameContext.isInitialized) return;

    const channel = supabase.channel('game-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games' },
        (payload) => {
          console.log('Game updated:', payload);
          if (payload.eventType === 'DELETE') return;
          
          const newGameState = payload.new;
          if (!newGameState || !newGameState.id) return;

          setGameContext(prev => {
            // Only update if this is for our current game
            if (prev.gameId && prev.gameId !== newGameState.id) return prev;

            const parsedCommunityCards = newGameState.community_cards ? 
              JSON.parse(newGameState.community_cards as string) : [];

            return {
              ...prev,
              gameId: newGameState.id,
              pot: newGameState.pot || 0,
              rake: newGameState.rake || 0,
              communityCards: parsedCommunityCards,
              currentPlayer: newGameState.current_player_index,
              gameState: newGameState.status as GameState,
              currentBet: newGameState.current_bet || 0,
              dealerPosition: newGameState.dealer_position
            };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players' },
        (payload) => {
          if (payload.eventType === 'DELETE' || !payload.new) return;

          const updatedPlayer = payload.new as {
            position: PlayerPosition;
            chips: number;
            cards: Card[];
            is_active: boolean;
            current_bet: number;
            is_turn: boolean;
            user_id: string | null;
            id: string;
            score: number;
          };

          console.log('Player update payload:', {
            eventType: payload.eventType,
            position: updatedPlayer.position,
            chips: updatedPlayer.chips,
            cards: updatedPlayer.cards,
            isActive: updatedPlayer.is_active,
            currentBet: updatedPlayer.current_bet,
            isTurn: updatedPlayer.is_turn,
            userId: updatedPlayer.user_id,
            score: updatedPlayer.score
          });

          setGameContext(prev => {
            // Find the existing player index
            const playerIndex = prev.players.findIndex(p => p.position === updatedPlayer.position);
            
            // Create new player object with proper initialization
            const newPlayer: Player = {
              id: updatedPlayer.id,
              name: updatedPlayer.user_id ? `Player ${updatedPlayer.id.slice(0, 4)}` : `Bot ${playerIndex + 1}`,
              chips: updatedPlayer.chips,
              cards: updatedPlayer.cards,
              position: updatedPlayer.position,
              isActive: updatedPlayer.is_active,
              currentBet: updatedPlayer.current_bet,
              isTurn: updatedPlayer.is_turn,
              score: updatedPlayer.score,
              isVisible: true,
              lastAction: undefined
            };

            let updatedPlayers: Player[];
            if (playerIndex === -1) {
              // Add new player
              updatedPlayers = [...prev.players, newPlayer];
            } else {
              // Update existing player
              updatedPlayers = [...prev.players];
              updatedPlayers[playerIndex] = {
                ...updatedPlayers[playerIndex],
                ...newPlayer
              };
            }

            // Calculate total pot from player bets
            const totalPot = updatedPlayers.reduce((sum, player) => sum + (player.currentBet || 0), 0);

            console.log('Updated player data:', {
              player: newPlayer,
              totalPot,
              activePlayers: updatedPlayers.filter(p => p.isActive).length,
              allPlayersActed: updatedPlayers.every(p => !p.isActive || p.currentBet === prev.currentBet)
            });

            return {
              ...prev,
              players: updatedPlayers,
              pot: totalPot
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameContext.isInitialized]);

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

  return { gameContext, setGameContext };
};
