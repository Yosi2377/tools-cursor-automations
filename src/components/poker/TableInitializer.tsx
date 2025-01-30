import { useEffect } from 'react';
import { GameContext, PlayerPosition, Card, GameState } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getPositionForIndex } from './TableLayout';
import { Database } from '@/integrations/supabase/types';

interface TableInitializerProps {
  roomId: string;
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>;
  setWithBots: React.Dispatch<React.SetStateAction<boolean>>;
}

type GameUpdatePayload = {
  new: Database['public']['Tables']['games']['Row'];
}

type PlayerUpdatePayload = {
  new: Database['public']['Tables']['game_players']['Row'];
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
              position: index.toString(),
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
                id: index,
                name: "Empty Seat",
                position: getPositionForIndex(index),
                chips: seat.chips,
                cards: [] as Card[],
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
                players: existingPlayers.map((player, index) => ({
                  id: index,
                  name: player.is_active ? "Player" : "Empty Seat",
                  position: getPositionForIndex(index),
                  chips: player.chips || 0,
                  cards: (player.cards as unknown as Card[]) || [],
                  isActive: player.is_active || false,
                  currentBet: player.current_bet || 0,
                  isTurn: player.is_turn || false,
                  score: player.score || 0
                }))
              }));
            }
          }

          // Subscribe to real-time updates for the game
          const channel = supabase.channel('game-updates')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
              (payload: GameUpdatePayload) => {
                console.log('Game updated:', payload);
                const newGameState = payload.new;
                setGameContext(prev => ({
                  ...prev,
                  pot: newGameState.pot || 0,
                  rake: newGameState.rake || 0,
                  communityCards: (newGameState.community_cards as unknown as Card[]) || [],
                  currentPlayer: newGameState.current_player_index || 0,
                  gameState: (newGameState.status || 'waiting') as GameState,
                  currentBet: newGameState.current_bet || 0,
                  dealerPosition: newGameState.dealer_position || 0,
                }));
              }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
              (payload: PlayerUpdatePayload) => {
                console.log('Player updated:', payload);
                const updatedPlayer = payload.new;
                setGameContext(prev => ({
                  ...prev,
                  players: prev.players.map((p, index) => 
                    index === Number(updatedPlayer.position)
                      ? {
                          ...p,
                          chips: updatedPlayer.chips || 0,
                          cards: (updatedPlayer.cards as unknown as Card[]) || [],
                          isActive: updatedPlayer.is_active || false,
                          currentBet: updatedPlayer.current_bet || 0,
                          isTurn: updatedPlayer.is_turn || false,
                          name: updatedPlayer.is_active ? "Player" : "Empty Seat"
                        }
                      : p
                  ),
                }));
              }
            )
            .subscribe();

          return () => {
            supabase.removeChannel(channel);
          };
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