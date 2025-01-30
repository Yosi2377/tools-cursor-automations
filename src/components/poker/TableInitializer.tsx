import { useEffect, useState } from 'react';
import { GameContext, PlayerPosition } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getPositionForIndex } from './TableLayout';

interface TableInitializerProps {
  roomId: string;
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>;
  setWithBots: React.Dispatch<React.SetStateAction<boolean>>;
}

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
            .select('*')
            .eq('room_id', roomId)
            .eq('status', 'waiting');

          let gameId;
          
          if (!existingGames || existingGames.length === 0) {
            // Create a new game if none exists
            const { data: newGame, error: gameError } = await supabase
              .from('games')
              .insert([{ 
                room_id: roomId,
                status: 'waiting',
                current_player_index: 0,
                dealer_position: 0,
                minimum_bet: room.min_bet
              }])
              .select()
              .single();

            if (gameError) throw gameError;
            gameId = newGame.id;

            // Initialize empty seats based on actual_players count
            const emptySeats = Array(room.actual_players).fill(null).map((_, index) => ({
              game_id: gameId,
              user_id: user.id,
              position: getPositionForIndex(index),
              is_active: false,
              chips: 1000,
              cards: []
            }));

            // Create game_players entries for empty seats
            const { error: playersError } = await supabase
              .from('game_players')
              .insert(emptySeats);

            if (playersError) throw playersError;

            // Initialize game context with empty seats
            setGameContext(prev => ({
              ...prev,
              players: emptySeats.map((seat, index) => ({
                id: index.toString(),
                name: "Empty Seat",
                position: seat.position,
                chips: seat.chips,
                cards: [],
                isActive: false,
                currentBet: 0,
                isTurn: false,
                score: 0
              }))
            }));
          } else {
            // Use existing game
            const game = existingGames[0];
            gameId = game.id;

            // Get existing players
            const { data: existingPlayers } = await supabase
              .from('game_players')
              .select('*')
              .eq('game_id', gameId);

            if (existingPlayers) {
              setGameContext(prev => ({
                ...prev,
                players: existingPlayers.map(player => ({
                  id: player.id,
                  name: player.is_active ? "Player" : "Empty Seat",
                  position: player.position,
                  chips: player.chips,
                  cards: player.cards || [],
                  isActive: player.is_active,
                  currentBet: player.current_bet,
                  isTurn: player.is_turn,
                  score: player.score || 0
                }))
              }));
            }
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