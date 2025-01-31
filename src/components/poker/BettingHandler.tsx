import { useCallback } from 'react';
import { GameContext, Player } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useBettingHandler = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
) => {
  const handleBet = useCallback(async (amount: number) => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    console.log(`${currentPlayer.name} attempting to bet ${amount}`);

    if (currentPlayer.chips < amount) {
      toast.error("Not enough chips to make this bet");
      return;
    }

    try {
      // Get current game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'betting')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (gameError) throw gameError;
      if (!game) {
        toast.error('No active game found');
        return;
      }

      // Get player data
      const { data: playerData, error: playerError } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('position', currentPlayer.position)
        .maybeSingle();

      if (playerError) throw playerError;
      if (!playerData) {
        toast.error('Player not found in game');
        return;
      }

      // Update player
      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          chips: currentPlayer.chips - amount,
          current_bet: currentPlayer.currentBet + amount,
          is_turn: false
        })
        .eq('id', playerData.id);

      if (updateError) throw updateError;

      // Update game state
      const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
      const { error: gameUpdateError } = await supabase
        .from('games')
        .update({
          pot: gameContext.pot + amount,
          current_bet: Math.max(gameContext.currentBet, currentPlayer.currentBet + amount),
          current_player_index: nextPlayerIndex
        })
        .eq('id', game.id);

      if (gameUpdateError) throw gameUpdateError;

      toast.success(`${currentPlayer.name} bet ${amount} chips`);

    } catch (error) {
      console.error('Error handling bet:', error);
      toast.error('Failed to place bet');
    }
  }, [gameContext]);

  const handleFold = useCallback(async () => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    
    try {
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'betting')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (gameError) throw gameError;
      if (!game) {
        toast.error('No active game found');
        return;
      }

      // Update player status
      const { data: playerData, error: playerError } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('position', currentPlayer.position)
        .maybeSingle();

      if (playerError) throw playerError;
      if (!playerData) {
        toast.error('Player not found in game');
        return;
      }

      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          is_active: false,
          is_turn: false
        })
        .eq('id', playerData.id);

      if (updateError) throw updateError;

      // Move to next player
      const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
      const { error: gameUpdateError } = await supabase
        .from('games')
        .update({
          current_player_index: nextPlayerIndex
        })
        .eq('id', game.id);

      if (gameUpdateError) throw gameUpdateError;

      toast.success(`${currentPlayer.name} folded`);

    } catch (error) {
      console.error('Error handling fold:', error);
      toast.error('Failed to fold');
    }
  }, [gameContext]);

  return { handleBet, handleFold };
};