import { useEffect, useState } from 'react';
import { GameContext, Player, PlayerPosition, Card } from '@/types/poker';
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
    const initializeGame = async () => {
      try {
        // Get room configuration
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError) throw roomError;

        // Initialize players based on room configuration
        const totalPlayers = room.actual_players;
        const initialPlayers: Player[] = Array(totalPlayers).fill(null).map((_, index) => ({
          id: `bot-${index + 1}`,
          name: room.with_bots ? `Bot ${index + 1}` : "Empty Seat",
          chips: 1000,
          cards: [],
          position: getPositionForIndex(index, totalPlayers),
          isActive: room.with_bots,
          currentBet: 0,
          isTurn: false,
          score: 0,
          isVisible: true,
          lastAction: undefined
        }));

        console.log('Room configuration:', room);
        console.log('Total players:', totalPlayers);
        console.log('Fetched player data:', initialPlayers);
        console.log('Fetched room data:', room);

        setGameContext(prev => ({
          ...prev,
          players: initialPlayers,
          minimumBet: room.min_bet,
          roomId,
          isInitialized: true
        }));

        console.log('Initialized players:', initialPlayers);

        // Fetch player data from the database
        const { data: playersData, error: playersError } = await supabase
          .from('game_players')
          .select('*');

        if (playersError) {
          console.error('Error fetching player data:', playersError);
        } else {
          console.log('Fetched players from database:', playersData);
          // Merge fetched player data with initialized players
          const updatedPlayers = initialPlayers.map(player => {
            const fetchedPlayer = playersData.find(p => p.position === player.position);
            return fetchedPlayer ? {
              ...player,
              chips: fetchedPlayer.chips,
              cards: fetchedPlayer.cards ? JSON.parse(fetchedPlayer.cards) : [],
              isActive: fetchedPlayer.is_active,
              currentBet: fetchedPlayer.current_bet,
              isTurn: fetchedPlayer.is_turn,
              score: fetchedPlayer.score
            } : player;
          });
          setGameContext(prev => ({
            ...prev,
            players: updatedPlayers
          }));
        }

      } catch (error) {
        console.error('Error initializing game:', error);
        toast.error('Failed to initialize game');
      }
    };

    initializeGame();
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
          setGameContext(prev => ({
            ...prev,
            pot: newGameState.pot || 0,
            rake: newGameState.rake || 0,
            communityCards: newGameState.community_cards || [],
            currentPlayer: newGameState.current_player_index,
            gameState: newGameState.status,
            currentBet: newGameState.current_bet || 0,
            dealerPosition: newGameState.dealer_position,
            gameId: newGameState.id
          }));
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
    }
  };

  useEffect(() => {
    checkGameState();
  }, [gameContext.players, gameContext.currentBet]);

  return { gameContext, setGameContext };
};
