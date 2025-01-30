import { useEffect, useState } from 'react';
import { GameContext, Player, PlayerPosition } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TableInitializerProps {
  roomId: string;
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>;
  setWithBots: React.Dispatch<React.SetStateAction<boolean>>;
}

export const getPositionForIndex = (index: number): PlayerPosition => {
  const positions: PlayerPosition[] = [
    'bottom', 'bottomRight', 'right', 'topRight',
    'top', 'topLeft', 'left', 'bottomLeft'
  ];
  return positions[index];
};

const TableInitializer: React.FC<TableInitializerProps> = ({ 
  roomId, 
  setGameContext,
  setWithBots 
}) => {
  useEffect(() => {
    const initializeGame = async () => {
      try {
        // Get room configuration
        const { data: room } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (room) {
          setWithBots(room.with_bots);

          // Get the current user's ID
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No authenticated user');

          // Check for existing active game
          const { data: existingGames } = await supabase
            .from('games')
            .select('id')
            .eq('room_id', roomId)
            .eq('status', 'waiting');

          let gameId;
          
          if (!existingGames || existingGames.length === 0) {
            // Create a new game if none exists
            const { data: newGame, error: gameError } = await supabase
              .from('games')
              .insert([{ room_id: roomId }])
              .select()
              .single();

            if (gameError) throw gameError;
            gameId = newGame.id;

            // Initialize empty seats based on actual_players count
            const emptySeats: Player[] = Array(room.actual_players).fill(null).map((_, index) => ({
              id: index + 1,
              name: "Empty Seat",
              chips: 1000,
              cards: [],
              position: getPositionForIndex(index),
              isActive: false,
              currentBet: 0,
              isTurn: false,
              score: 0
            }));

            // Create game_players entries for empty seats
            const { error: playersError } = await supabase
              .from('game_players')
              .insert(
                emptySeats.map(seat => ({
                  game_id: newGame.id,
                  user_id: user.id,
                  position: seat.position,
                  is_active: false,
                  chips: 1000,
                  cards: []
                }))
              );

            if (playersError) throw playersError;

            setGameContext(prev => ({
              ...prev,
              players: emptySeats
            }));
          } else {
            // Use the most recent waiting game
            gameId = existingGames[0].id;
          }
        }
      } catch (error) {
        console.error('Error initializing game:', error);
        toast.error('Failed to initialize game');
      }
    };

    initializeGame();
  }, [roomId, setGameContext, setWithBots]);

  return null;
};

export default TableInitializer;