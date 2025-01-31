import { useEffect } from 'react';
import { GameContext, PlayerPosition, Card, GameState } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
          console.log('Room config:', room);
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
                minimum_bet: room.min_bet,
                community_cards: []
              }])
              .select()
              .single();

            if (gameError) throw gameError;
            gameId = newGame.id;

            // Initialize positions for all players
            const positions = Array(room.actual_players).fill(null).map((_, index) => ({
              game_id: gameId,
              user_id: room.with_bots && index > 0 ? `bot-${index}` : null,
              position: index.toString(),
              is_active: room.with_bots && index > 0, // Bots are active by default
              chips: 1000,
              cards: [],
              current_bet: 0,
              is_turn: false,
              score: 0
            }));

            // Create game_players entries
            const { error: playersError } = await supabase
              .from('game_players')
              .insert(positions);

            if (playersError) throw playersError;

            // Initialize game context with positions and bots
            setGameContext(prev => ({
              ...prev,
              gameId,
              minimumBet: room.min_bet,
              players: positions.map((seat, index) => ({
                id: index,
                name: room.with_bots && index > 0 ? `Bot ${index}` : 'Empty Seat',
                position: getPositionForIndex(index),
                chips: seat.chips,
                cards: [],
                isActive: seat.is_active,
                currentBet: 0,
                isTurn: false,
                score: 0
              })),
              pot: 0,
              rake: 0,
              communityCards: [],
              currentPlayer: 0,
              gameState: 'waiting' as GameState,
              currentBet: 0,
              dealerPosition: 0
            }));

            console.log('Initialized players:', positions);
          } else {
            // Use existing game
            gameId = existingGames[0].id;

            // Get existing players
            const { data: existingPlayers } = await supabase
              .from('game_players')
              .select('*')
              .eq('game_id', gameId)
              .order('position');

            if (existingPlayers) {
              console.log('Existing players:', existingPlayers);
              
              // Map existing players to game context format
              const mappedPlayers = existingPlayers.map((player, index) => ({
                id: index,
                name: player.user_id?.startsWith('bot-') ? 
                  `Bot ${index}` : 
                  (player.is_active ? 'Player' : 'Empty Seat'),
                position: getPositionForIndex(index),
                chips: player.chips || 1000,
                cards: (player.cards as Card[]) || [],
                isActive: player.is_active || false,
                currentBet: player.current_bet || 0,
                isTurn: player.is_turn || false,
                score: player.score || 0
              }));

              setGameContext(prev => ({
                ...prev,
                gameId,
                minimumBet: room.min_bet,
                players: mappedPlayers,
                pot: existingGames[0].pot || 0,
                rake: existingGames[0].rake || 0,
                communityCards: (existingGames[0].community_cards as Card[]) || [],
                currentPlayer: existingGames[0].current_player_index || 0,
                gameState: (existingGames[0].status || 'waiting') as GameState,
                currentBet: existingGames[0].current_bet || 0,
                dealerPosition: existingGames[0].dealer_position || 0
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

const getPositionForIndex = (index: number): PlayerPosition => {
  const positions: PlayerPosition[] = [
    'bottom', 'bottomRight', 'right', 'topRight',
    'top', 'topLeft', 'left', 'bottomLeft'
  ];
  return positions[index % positions.length];
};

export default TableInitializer;