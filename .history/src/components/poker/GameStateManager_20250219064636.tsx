
import { useEffect, useState } from 'react';
import { GameContext, Player } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    roomId
  });

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
          id: index + 1,
          name: room.with_bots ? `Bot ${index + 1}` : "Empty Seat",
          chips: 1000,
          cards: [],
          position: getPositionForIndex(index, totalPlayers),
          isActive: room.with_bots,
          currentBet: 0,
          isTurn: false,
          score: 0
        }));

        setGameContext(prev => ({
          ...prev,
          players: initialPlayers,
          minimumBet: room.min_bet,
          roomId
        }));

      } catch (error) {
        console.error('Error initializing game:', error);
        toast.error('Failed to initialize game');
      }
    };

    initializeGame();
  }, [roomId]);

  // Subscribe to game updates
  useEffect(() => {
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
            pot: newGameState.pot,
            rake: newGameState.rake,
            communityCards: newGameState.community_cards || [],
            currentPlayer: newGameState.current_player_index,
            gameState: newGameState.status,
            currentBet: newGameState.current_bet,
            dealerPosition: newGameState.dealer_position,
            gameId: newGameState.id
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players' },
        (payload) => {
          console.log('Player updated:', payload);
          if (payload.eventType === 'DELETE') return;

          const updatedPlayer = payload.new;
          setGameContext(prev => ({
            ...prev,
            players: prev.players.map(p => 
              p.position === updatedPlayer.position
                ? {
                    ...p,
                    chips: updatedPlayer.chips,
                    cards: updatedPlayer.cards,
                    isActive: updatedPlayer.is_active,
                    currentBet: updatedPlayer.current_bet,
                    isTurn: updatedPlayer.is_turn,
                    name: updatedPlayer.user_id ? `Player ${updatedPlayer.id.slice(0, 4)}` : p.name,
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
  }, []);

  const getPositionForIndex = (index: number, totalPlayers: number) => {
    const positions = [
      'bottom', 'bottomRight', 'right', 'topRight',
      'top', 'topLeft', 'left', 'bottomLeft'
    ];
    return positions[index % positions.length] as any;
  };

  return { gameContext, setGameContext };
};
