import { useCallback, useMemo } from 'react';
import { GameContext } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BettingHandlerHook {
  handleBet: (amount: number) => Promise<void>;
  handleCall: () => Promise<void>;
  handleFold: () => Promise<void>;
  handleCheck: () => Promise<void>;
  handleRaise: () => Promise<void>;
  isValidAction: (action: string) => boolean;
}

export const useBettingHandler = (
  gameContext: GameContext,
  updateGameState: (updater: (prevState: GameContext) => GameContext) => void
): BettingHandlerHook => {
  // Memoize the current player to prevent unnecessary re-renders
  const currentPlayer = useMemo(() => {
    return gameContext.players.find(p => p.isTurn);
  }, [gameContext.players]);

  const handleBet = useCallback(async (amount: number): Promise<void> => {
    try {
      if (!currentPlayer) {
        toast.error('No active player found');
        return;
      }

      if (amount > currentPlayer.chips) {
        toast.error('Insufficient chips');
        return;
      }

      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          current_bet: amount,
          chips: currentPlayer.chips - amount,
          is_active: true,
          is_turn: false,
          has_acted: true,
          last_action: 'bet'
        })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', currentPlayer.id);

      if (updateError) throw updateError;

      updateGameState(prev => {
        const updatedPlayers = prev.players.map(player =>
          player.id === currentPlayer.id
            ? {
                ...player,
                currentBet: amount,
                chips: player.chips - amount,
                hasActed: true,
                lastAction: 'bet',
                isTurn: false
              }
            : player
        );

        // Only update if something changed
        if (JSON.stringify(prev.players) === JSON.stringify(updatedPlayers)) {
          return prev;
        }

        return {
          ...prev,
          currentBet: amount,
          players: updatedPlayers
        };
      });

      toast.success(`Bet placed: $${amount}`);
    } catch (error) {
      console.error('Error handling bet:', error);
      toast.error('Failed to place bet');
    }
  }, [gameContext.gameId, currentPlayer, updateGameState]);

  const handleCall = useCallback(async (): Promise<void> => {
    try {
      if (!currentPlayer) {
        toast.error('No active player found');
        return;
      }

      const callAmount = gameContext.currentBet - (currentPlayer.currentBet || 0);
      if (callAmount > currentPlayer.chips) {
        toast.error('Insufficient chips to call');
        return;
      }

      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          current_bet: gameContext.currentBet,
          chips: currentPlayer.chips - callAmount,
          is_active: true,
          is_turn: false,
          has_acted: true,
          last_action: 'call'
        })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', currentPlayer.id);

      if (updateError) throw updateError;

      updateGameState(prev => {
        const updatedPlayers = prev.players.map(player =>
          player.id === currentPlayer.id
            ? {
                ...player,
                currentBet: prev.currentBet,
                chips: player.chips - callAmount,
                hasActed: true,
                lastAction: 'call',
                isTurn: false
              }
            : player
        );

        // Only update if something changed
        if (JSON.stringify(prev.players) === JSON.stringify(updatedPlayers)) {
          return prev;
        }

        return {
          ...prev,
          players: updatedPlayers
        };
      });

      toast.success(`Called: $${callAmount}`);
    } catch (error) {
      console.error('Error handling call:', error);
      toast.error('Failed to call');
    }
  }, [gameContext.gameId, gameContext.currentBet, currentPlayer, updateGameState]);

  const handleFold = useCallback(async (): Promise<void> => {
    try {
      if (!currentPlayer) {
        toast.error('No active player found');
        return;
      }

      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          is_active: false,
          is_turn: false,
          has_acted: true,
          last_action: 'fold'
        })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', currentPlayer.id);

      if (updateError) throw updateError;

      updateGameState(prev => {
        const updatedPlayers = prev.players.map(player =>
          player.id === currentPlayer.id
            ? {
                ...player,
                isActive: false,
                hasFolded: true,
                hasActed: true,
                lastAction: 'fold',
                isTurn: false
              }
            : player
        );

        // Only update if something changed
        if (JSON.stringify(prev.players) === JSON.stringify(updatedPlayers)) {
          return prev;
        }

        return {
          ...prev,
          players: updatedPlayers
        };
      });

      toast.success('Folded');
    } catch (error) {
      console.error('Error handling fold:', error);
      toast.error('Failed to fold');
    }
  }, [gameContext.gameId, currentPlayer, updateGameState]);

  const handleCheck = useCallback(async (): Promise<void> => {
    try {
      if (!currentPlayer) {
        toast.error('No active player found');
        return;
      }

      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          is_active: true,
          is_turn: false,
          has_acted: true,
          last_action: 'check'
        })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', currentPlayer.id);

      if (updateError) throw updateError;

      updateGameState(prev => {
        const updatedPlayers = prev.players.map(player =>
          player.id === currentPlayer.id
            ? {
                ...player,
                hasActed: true,
                lastAction: 'check',
                isTurn: false
              }
            : player
        );

        // Only update if something changed
        if (JSON.stringify(prev.players) === JSON.stringify(updatedPlayers)) {
          return prev;
        }

        return {
          ...prev,
          players: updatedPlayers
        };
      });

      toast.success('Checked');
    } catch (error) {
      console.error('Error handling check:', error);
      toast.error('Failed to check');
    }
  }, [gameContext.gameId, currentPlayer, updateGameState]);

  const handleRaise = useCallback(async (): Promise<void> => {
    try {
      if (!currentPlayer) {
        toast.error('No active player found');
        return;
      }

      const minRaise = gameContext.currentBet * 2;
      if (minRaise > currentPlayer.chips) {
        toast.error('Insufficient chips to raise');
        return;
      }

      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          current_bet: minRaise,
          chips: currentPlayer.chips - (minRaise - (currentPlayer.currentBet || 0)),
          is_active: true,
          is_turn: false,
          has_acted: true,
          last_action: 'raise'
        })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', currentPlayer.id);

      if (updateError) throw updateError;

      updateGameState(prev => {
        const updatedPlayers = prev.players.map(player =>
          player.id === currentPlayer.id
            ? {
                ...player,
                currentBet: minRaise,
                chips: player.chips - (minRaise - (player.currentBet || 0)),
                hasActed: true,
                lastAction: 'raise',
                isTurn: false
              }
            : player
        );

        // Only update if something changed
        if (JSON.stringify(prev.players) === JSON.stringify(updatedPlayers)) {
          return prev;
        }

        return {
          ...prev,
          currentBet: minRaise,
          players: updatedPlayers
        };
      });

      toast.success(`Raised to: $${minRaise}`);
    } catch (error) {
      console.error('Error handling raise:', error);
      toast.error('Failed to raise');
    }
  }, [gameContext.gameId, gameContext.currentBet, currentPlayer, updateGameState]);

  const isValidAction = useCallback((action: string): boolean => {
    if (!currentPlayer) return false;

    switch (action) {
      case 'check':
        return currentPlayer.currentBet === gameContext.currentBet;
      case 'call':
        return currentPlayer.currentBet < gameContext.currentBet;
      case 'raise':
        return currentPlayer.chips >= gameContext.currentBet * 2;
      case 'fold':
        return true;
      default:
        return false;
    }
  }, [currentPlayer, gameContext.currentBet]);

  return {
    handleBet,
    handleCall,
    handleFold,
    handleCheck,
    handleRaise,
    isValidAction
  };
};