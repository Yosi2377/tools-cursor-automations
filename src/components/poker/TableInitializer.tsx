import { useEffect, useState } from 'react';
import { GameContext, Player, PlayerPosition } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { dealCards } from '@/utils/pokerLogic';

interface TableInitializerProps {
  roomId: string;
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>;
  setWithBots: React.Dispatch<React.SetStateAction<boolean>>;
}

export const getPositionForIndex = (index: number, totalPlayers: number): PlayerPosition => {
  const positions: PlayerPosition[] = [
    'bottom', 'bottomRight', 'right', 'topRight',
    'top', 'topLeft', 'left', 'bottomLeft'
  ];
  return positions[index % positions.length];
};

const TableInitializer: React.FC<TableInitializerProps> = ({ 
  roomId, 
  setGameContext,
  setWithBots 
}) => {
  useEffect(() => {
    const initializeGame = async () => {
      try {
        const { data: room } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (room) {
          setWithBots(room.with_bots);
          
          // Initialize players based on room configuration
          const totalPlayers = room.actual_players;
          const players: Player[] = Array(totalPlayers).fill(null).map((_, index) => ({
            id: index + 1,
            name: room.with_bots ? `Bot ${index + 1}` : "Empty Seat",
            chips: 1000,
            cards: [],
            position: getPositionForIndex(index, totalPlayers),
            isActive: room.with_bots, // Bots are active by default
            currentBet: 0,
            isTurn: false,
            score: 0
          }));

          // If room has bots, start a new game immediately
          if (room.with_bots) {
            const { updatedPlayers, remainingDeck } = dealCards(players);
            const firstPlayerIndex = 1; // Start with the first player after dealer

            // Create a new game in the database
            const { data: game, error: gameError } = await supabase
              .from('games')
              .insert([{
                room_id: roomId,
                status: 'betting',
                current_player_index: firstPlayerIndex,
                pot: 0,
                current_bet: room.min_bet,
                dealer_position: 0
              }])
              .select()
              .single();

            if (gameError) throw gameError;

            // Generate bot user IDs using a consistent pattern
            const botUserIds = Array(totalPlayers).fill(null).map((_, index) => 
              `bot-${roomId}-${index + 1}`
            );

            // Insert game players with bot user IDs
            const { error: playersError } = await supabase
              .from('game_players')
              .insert(
                updatedPlayers.map((p, index) => ({
                  game_id: game.id,
                  user_id: botUserIds[index], // Add the bot user ID
                  position: p.position,
                  chips: p.chips,
                  cards: p.cards,
                  is_active: true,
                  current_bet: 0,
                  is_turn: p.position === getPositionForIndex(firstPlayerIndex, totalPlayers)
                }))
              );

            if (playersError) throw playersError;

            setGameContext(prev => ({
              ...prev,
              players: updatedPlayers.map((p, i) => ({
                ...p,
                isTurn: i === firstPlayerIndex,
                isActive: true
              })),
              gameState: "betting",
              currentPlayer: firstPlayerIndex,
              pot: 0,
              currentBet: room.min_bet,
              dealerPosition: 0
            }));
          } else {
            // For rooms without bots, just set up empty seats
            setGameContext(prev => ({
              ...prev,
              players: players
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