import { GameContext } from '@/types/poker';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useBettingHandler = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
) => {
  const updateGameState = async (
    actualBetAmount: number,
    currentPlayer: any,
    retryCount = 0
  ) => {
    try {
      const { error: gameError } = await supabase
        .from('games')
        .update({
          pot: gameContext.pot + actualBetAmount,
          current_bet: Math.max(gameContext.currentBet, currentPlayer.currentBet + actualBetAmount),
          current_player_index: (gameContext.currentPlayer + 1) % gameContext.players.length
        })
        .eq('id', gameContext.gameId);

      if (gameError) {
        console.error('Error updating game state:', gameError);
        if (retryCount < MAX_RETRIES) {
          await delay(RETRY_DELAY);
          return updateGameState(actualBetAmount, currentPlayer, retryCount + 1);
        }
        throw gameError;
      }
    } catch (error) {
      console.error('Error in updateGameState:', error);
      toast.error('Failed to update game state. Please try again.');
      throw error;
    }
  };

  const updatePlayerBet = async (
    currentPlayer: any,
    actualBetAmount: number,
    retryCount = 0
  ) => {
    try {
      const { error: playerError } = await supabase
        .from('game_players')
        .update({
          chips: currentPlayer.chips - actualBetAmount,
          current_bet: currentPlayer.currentBet + actualBetAmount,
          is_turn: false
        })
        .eq('id', currentPlayer.id.toString()); // Convert id to string here

      if (playerError) {
        console.error('Error updating player bet:', playerError);
        if (retryCount < MAX_RETRIES) {
          await delay(RETRY_DELAY);
          return updatePlayerBet(currentPlayer, actualBetAmount, retryCount + 1);
        }
        throw playerError;
      }
    } catch (error) {
      console.error('Error in updatePlayerBet:', error);
      toast.error('Failed to update player bet. Please try again.');
      throw error;
    }
  };

  const handleBet = async (amount: number) => {
    try {
      const currentPlayer = gameContext.players[gameContext.currentPlayer];
      const actualBetAmount = Math.min(amount, currentPlayer.chips);

      if (actualBetAmount <= 0) {
        toast.error("Invalid bet amount");
        return;
      }

      // Update player's bet first
      await updatePlayerBet(currentPlayer, actualBetAmount);
      
      // Then update game state
      await updateGameState(actualBetAmount, currentPlayer);

      // Update local state
      setGameContext(prev => ({
        ...prev,
        pot: prev.pot + actualBetAmount,
        currentBet: Math.max(prev.currentBet, currentPlayer.currentBet + actualBetAmount),
        players: prev.players.map(p => 
          p.id === currentPlayer.id
            ? {
                ...p,
                chips: p.chips - actualBetAmount,
                currentBet: p.currentBet + actualBetAmount,
                isTurn: false
              }
            : p.id === prev.players[(prev.currentPlayer + 1) % prev.players.length].id
            ? { ...p, isTurn: true }
            : p
        ),
        currentPlayer: (prev.currentPlayer + 1) % prev.players.length
      }));

      toast.success(`Bet placed: $${actualBetAmount}`);
    } catch (error) {
      console.error('Error handling bet:', error);
      toast.error('Failed to place bet. Please try again.');
    }
  };

  const handleFold = async () => {
    try {
      const currentPlayer = gameContext.players[gameContext.currentPlayer];

      const { error: playerError } = await supabase
        .from('game_players')
        .update({
          is_active: false,
          is_turn: false
        })
        .eq('id', currentPlayer.id);

      if (playerError) throw playerError;

      const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;

      const { error: gameError } = await supabase
        .from('games')
        .update({
          current_player_index: nextPlayerIndex
        })
        .eq('id', gameContext.gameId);

      if (gameError) throw gameError;

      setGameContext(prev => ({
        ...prev,
        players: prev.players.map(p => 
          p.id === currentPlayer.id
            ? { ...p, isActive: false, isTurn: false }
            : p.id === prev.players[nextPlayerIndex].id
            ? { ...p, isTurn: true }
            : p
        ),
        currentPlayer: nextPlayerIndex
      }));

      toast.success(`${currentPlayer.name} folded`);
    } catch (error) {
      console.error('Error handling fold:', error);
      toast.error('Failed to fold. Please try again.');
    }
  };

  return {
    handleBet,
    handleFold
  };
};