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

const getPositionForIndex = (index: number, totalPlayers: number): PlayerPosition => {
  const positions: PlayerPosition[] = [
    'bottom',
    'bottomRight',
    'right',
    'topRight',
    'top',
    'topLeft',
    'left',
    'bottomLeft'
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

        if (!room) {
          throw new Error('Room not found');
        }

        setWithBots(room.with_bots);
        
        // Initialize players based on room configuration
        const totalPlayers = room.with_bots ? 8 : room.actual_players;
        const players: Player[] = Array(totalPlayers).fill(null).map((_, index) => ({
          id: `bot-${index}`,
          name: `Bot ${index}`,
          chips: 1000,
          cards: [],
          position: getPositionForIndex(index, totalPlayers),
          isActive: true,
          currentBet: 0,
          isTurn: false,
          score: 0,
          isVisible: true,
          lastAction: undefined,
          hasActed: false,
          hasFolded: false,
          stack: 1000
        }));

        // If room has bots, start a new game immediately
        if (room.with_bots) {
          const { data: botIds, error: botIdsError } = await supabase
            .rpc('generate_bot_uuids', { count: totalPlayers });

          if (botIdsError || !botIds || !Array.isArray(botIds)) {
            throw new Error('Failed to generate bot UUIDs');
          }

          // Create a new game in the database
          const { data: game, error: gameError } = await supabase
            .from('games')
            .insert([{
              room_id: roomId,
              status: 'betting',
              current_player_index: 1,
              pot: 0,
              current_bet: room.min_bet,
              dealer_position: 0,
              community_cards: JSON.stringify([])
            }])
            .select()
            .single();

          if (gameError || !game) {
            throw new Error('Failed to create game');
          }

          // Insert game players with proper UUIDs
          const { error: playersError } = await supabase
            .from('game_players')
            .insert(
              players.map((p, index) => ({
                game_id: game.id,
                user_id: botIds[index],
                position: p.position,
                chips: p.chips,
                cards: JSON.stringify([]),
                is_active: true,
                current_bet: 0,
                is_turn: index === 1,
                is_visible: true,
                name: `Bot ${index}`,
                has_acted: false,
                has_folded: false
              }))
            );

          if (playersError) {
            throw new Error('Failed to create game players');
          }

          // Verify bot visibility in database
          const { data: verifyBots, error: verifyError } = await supabase
            .from('game_players')
            .select('is_visible')
            .eq('game_id', game.id);

          if (verifyError || !verifyBots || !verifyBots.every(bot => bot.is_visible)) {
            throw new Error('Failed to verify bot visibility');
          }

          // Update game context with initialized bots
          setGameContext(prev => ({
            ...prev,
            players: players.map((p, i) => ({
              ...p,
              id: botIds[i],
              isTurn: i === 1,
              isActive: true,
              isVisible: true
            })),
            gameState: "betting",
            currentPlayer: 1,
            pot: 0,
            currentBet: room.min_bet,
            dealerPosition: 0,
            gameId: game.id,
            isInitialized: true,
            roomId: roomId
          }));

          toast.success('Game initialized with bots');
        } else {
          // For rooms without bots, just set up empty seats
          setGameContext(prev => ({
            ...prev,
            players: players
          }));
        }
      } catch (error: unknown) {
        console.error('Error initializing game:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to initialize game');
      }
    };

    initializeGame();
  }, [roomId, setGameContext, setWithBots]);

  return null;
};

export default TableInitializer;