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

          // Create a new game if one doesn't exist
          const { data: existingGame } = await supabase
            .from('games')
            .select('id')
            .eq('room_id', roomId)
            .single();

          if (!existingGame) {
            const { data: newGame, error: gameError } = await supabase
              .from('games')
              .insert([{ room_id: roomId }])
              .select()
              .single();

            if (gameError) throw gameError;

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

            // Get the current user's ID
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No authenticated user');

            // Create game_players entries for empty seats
            const { error: playersError } = await supabase
              .from('game_players')
              .insert(
                emptySeats.map(seat => ({
                  game_id: newGame.id,
                  user_id: user.id, // Add the user_id field
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