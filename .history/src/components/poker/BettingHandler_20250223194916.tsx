import { GameContext, Player } from '@/types/poker';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const useBettingHandler = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
) => {
  const updateGameState = async (
    actualBetAmount: number,
    currentPlayer: Player,
    retryCount = 0
  ): Promise<void> => {
    if (!gameContext.gameId) {
      console.error('No game ID found in context');
      return;
    }

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
    } catch (error: unknown) {
      if (error instanceof PostgrestError) {
        console.error('Database error updating game state:', error.message);
      } else if (error instanceof Error) {
        console.error('Error updating game state:', error.message);
      } else {
        console.error('Unknown error updating game state:', error);
      }
      toast.error('Failed to update game state. Please try again.');
      throw error;
    }
  };

  const updatePlayerBet = async (
    currentPlayer: Player,
    actualBetAmount: number,
    retryCount = 0
  ): Promise<void> => {
    try {
      // Get the player's UUID from the game_players table
      const { data: playerData, error: playerLookupError } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', gameContext.gameId)
        .eq('position', currentPlayer.position)
        .single();

      if (playerLookupError) {
        console.error('Error finding player:', playerLookupError);
        throw playerLookupError;
      }

      if (!playerData) {
        console.error('No player found for position:', currentPlayer.position);
        toast.error('Player not found in game');
        return;
      }

      const { error: playerError } = await supabase
        .from('game_players')
        .update({
          chips: currentPlayer.chips - actualBetAmount,
          current_bet: currentPlayer.currentBet + actualBetAmount,
          is_turn: false
        })
        .eq('id', playerData.id);

      if (playerError) {
        console.error('Error updating player bet:', playerError);
        if (retryCount < MAX_RETRIES) {
          await delay(RETRY_DELAY);
          return updatePlayerBet(currentPlayer, actualBetAmount, retryCount + 1);
        }
        throw playerError;
      }
    } catch (error: unknown) {
      if (error instanceof PostgrestError) {
        console.error('Database error updating player bet:', error.message);
      } else if (error instanceof Error) {
        console.error('Error updating player bet:', error.message);
      } else {
        console.error('Unknown error updating player bet:', error);
      }
      toast.error('Failed to update player bet. Please try again.');
      throw error;
    }
  };

  const handleBet = async (amount: number): Promise<void> => {
    try {
      const currentPlayer = gameContext.players[gameContext.currentPlayer];
      const actualBetAmount = Math.min(amount, currentPlayer.chips);

      if (actualBetAmount <= 0) {
        toast.error("Invalid bet amount");
        return;
      }

      if (!gameContext.gameId) {
        toast.error("No active game found");
        return;
      }

      console.log('Handling bet:', {
        player: currentPlayer.name,
        amount: actualBetAmount,
        gameId: gameContext.gameId
      });

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
    } catch (error: unknown) {
      if (error instanceof PostgrestError) {
        console.error('Database error handling bet:', error.message);
      } else if (error instanceof Error) {
        console.error('Error handling bet:', error.message);
      } else {
        console.error('Unknown error handling bet:', error);
      }
      toast.error('Failed to place bet. Please try again.');
    }
  };

  const handleFold = async (): Promise<void> => {
    if (!gameContext.gameId) {
      console.error('No game ID found in context');
      return;
    }

    try {
      const currentPlayer = gameContext.players[gameContext.currentPlayer];

      // Get the player's UUID from the game_players table
      const { data: playerData, error: playerLookupError } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', gameContext.gameId)
        .eq('position', currentPlayer.position)
        .single();

      if (playerLookupError) {
        console.error('Error finding player:', playerLookupError);
        throw playerLookupError;
      }

      if (!playerData) {
        console.error('No player found for position:', currentPlayer.position);
        toast.error('Player not found in game');
        return;
      }

      const { error: playerError } = await supabase
        .from('game_players')
        .update({
          is_active: false,
          is_turn: false
        })
        .eq('id', playerData.id);

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
    } catch (error: unknown) {
      if (error instanceof PostgrestError) {
        console.error('Database error handling fold:', error.message);
      } else if (error instanceof Error) {
        console.error('Error handling fold:', error.message);
      } else {
        console.error('Unknown error handling fold:', error);
      }
      toast.error('Failed to fold. Please try again.');
    }
  };

  return {
    handleBet,
    handleFold
  };
};