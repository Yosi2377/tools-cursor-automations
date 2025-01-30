import { GameContext, Card } from '@/types/poker';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const updatePlayerBet = async (
  currentPlayer: any,
  actualBetAmount: number
) => {
  const { error: playerError } = await supabase
    .from('game_players')
    .update({
      chips: currentPlayer.chips - actualBetAmount,
      current_bet: currentPlayer.currentBet + actualBetAmount,
      is_turn: false
    })
    .eq('id', currentPlayer.id.toString());

  if (playerError) throw playerError;
};

export const updateGameState = async (
  gameContext: GameContext,
  actualBetAmount: number,
  currentPlayer: any
) => {
  const { error: gameError } = await supabase
    .from('games')
    .update({
      pot: gameContext.pot + actualBetAmount,
      current_bet: Math.max(gameContext.currentBet, currentPlayer.currentBet + actualBetAmount),
      current_player_index: (gameContext.currentPlayer + 1) % gameContext.players.length
    })
    .eq('status', 'betting');

  if (gameError) throw gameError;
};

export const handlePlayerFoldUpdate = async (currentPlayer: any) => {
  const { error: playerError } = await supabase
    .from('game_players')
    .update({
      is_active: false,
      is_turn: false
    })
    .eq('id', currentPlayer.id.toString());

  if (playerError) throw playerError;
};

export const updateGameStateAfterFold = async (nextPlayerIndex: number) => {
  const { error: gameError } = await supabase
    .from('games')
    .update({
      current_player_index: nextPlayerIndex
    })
    .eq('status', 'betting');

  if (gameError) throw gameError;
};