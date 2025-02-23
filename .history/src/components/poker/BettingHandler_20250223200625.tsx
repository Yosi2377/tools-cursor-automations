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
  const handleBet = async (amount: number): Promise<void> => {
    try {
      const currentPlayer = gameContext.players.find(p => p.isTurn);
      if (!currentPlayer) {
        toast.error('No active player found');
        return;
      }

      if (amount > currentPlayer.chips) {
        toast.error('Insufficient chips');
        return;
      }

      // Update player bet in database
      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          current_bet: amount,
          chips: currentPlayer.chips - amount,
          last_action: 'bet'
        })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', currentPlayer.id);

      if (updateError) {
        console.error('Error updating bet:', updateError);
        toast.error('Failed to place bet');
        return;
      }

      // Update game context
      updateGameState(prev => ({
        ...prev,
        currentBet: amount,
        players: prev.players.map(player =>
          player.id === currentPlayer.id
            ? {
                ...player,
                currentBet: amount,
                chips: player.chips - amount,
                hasActed: true,
                lastAction: 'bet'
              }
            : player
        )
      }));

      toast.success(`Bet placed: $${amount}`);
    } catch (error) {
      console.error('Error handling bet:', error);
      toast.error('Failed to place bet');
    }
  };

  const handleCall = async (): Promise<void> => {
    try {
      const currentPlayer = gameContext.players.find(p => p.isTurn);
      if (!currentPlayer) {
        toast.error('No active player found');
        return;
      }

      const callAmount = gameContext.currentBet - (currentPlayer.currentBet || 0);
      if (callAmount > currentPlayer.chips) {
        toast.error('Insufficient chips to call');
        return;
      }

      // Update player call in database
      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          current_bet: gameContext.currentBet,
          chips: currentPlayer.chips - callAmount,
          last_action: 'call'
        })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', currentPlayer.id);

      if (updateError) {
        console.error('Error updating call:', updateError);
        toast.error('Failed to call');
        return;
      }

      // Update game context
      updateGameState(prev => ({
        ...prev,
        players: prev.players.map(player =>
          player.id === currentPlayer.id
            ? {
                ...player,
                currentBet: prev.currentBet,
                chips: player.chips - callAmount,
                hasActed: true,
                lastAction: 'call'
              }
            : player
        )
      }));

      toast.success(`Called: $${callAmount}`);
    } catch (error) {
      console.error('Error handling call:', error);
      toast.error('Failed to call');
    }
  };

  const handleFold = async (): Promise<void> => {
    try {
      const currentPlayer = gameContext.players.find(p => p.isTurn);
      if (!currentPlayer) {
        toast.error('No active player found');
        return;
      }

      // Update player fold in database
      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          is_active: false,
          last_action: 'fold'
        })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', currentPlayer.id);

      if (updateError) {
        console.error('Error updating fold:', updateError);
        toast.error('Failed to fold');
        return;
      }

      // Update game context
      updateGameState(prev => ({
        ...prev,
        players: prev.players.map(player =>
          player.id === currentPlayer.id
            ? {
                ...player,
                isActive: false,
                hasFolded: true,
                hasActed: true,
                lastAction: 'fold'
              }
            : player
        )
      }));

      toast.success('Folded');
    } catch (error) {
      console.error('Error handling fold:', error);
      toast.error('Failed to fold');
    }
  };

  const handleCheck = async (): Promise<void> => {
    try {
      const currentPlayer = gameContext.players.find(p => p.isTurn);
      if (!currentPlayer) {
        toast.error('No active player found');
        return;
      }

      // Update player check in database
      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          last_action: 'check'
        })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', currentPlayer.id);

      if (updateError) {
        console.error('Error updating check:', updateError);
        toast.error('Failed to check');
        return;
      }

      // Update game context
      updateGameState(prev => ({
        ...prev,
        players: prev.players.map(player =>
          player.id === currentPlayer.id
            ? {
                ...player,
                hasActed: true,
                lastAction: 'check'
              }
            : player
        )
      }));

      toast.success('Checked');
    } catch (error) {
      console.error('Error handling check:', error);
      toast.error('Failed to check');
    }
  };

  const handleRaise = async (): Promise<void> => {
    try {
      const currentPlayer = gameContext.players.find(p => p.isTurn);
      if (!currentPlayer) {
        toast.error('No active player found');
        return;
      }

      const minRaise = gameContext.currentBet * 2;
      if (minRaise > currentPlayer.chips) {
        toast.error('Insufficient chips to raise');
        return;
      }

      // Update player raise in database
      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          current_bet: minRaise,
          chips: currentPlayer.chips - (minRaise - (currentPlayer.currentBet || 0)),
          last_action: 'raise'
        })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', currentPlayer.id);

      if (updateError) {
        console.error('Error updating raise:', updateError);
        toast.error('Failed to raise');
        return;
      }

      // Update game context
      updateGameState(prev => ({
        ...prev,
        currentBet: minRaise,
        players: prev.players.map(player =>
          player.id === currentPlayer.id
            ? {
                ...player,
                currentBet: minRaise,
                chips: player.chips - (minRaise - (player.currentBet || 0)),
                hasActed: true,
                lastAction: 'raise'
              }
            : {
                ...player,
                hasActed: false
              }
        )
      }));

      toast.success(`Raised to: $${minRaise}`);
    } catch (error) {
      console.error('Error handling raise:', error);
      toast.error('Failed to raise');
    }
  };

  const isValidAction = (action: string): boolean => {
    const currentPlayer = gameContext.players.find(p => p.isTurn);
    if (!currentPlayer) return false;

    switch (action) {
      case 'check':
        return gameContext.currentBet === 0 || currentPlayer.currentBet === gameContext.currentBet;
      case 'call':
        return gameContext.currentBet > 0 && currentPlayer.currentBet !== gameContext.currentBet;
      case 'bet':
        return gameContext.currentBet === 0;
      case 'raise':
        return gameContext.currentBet > 0 && currentPlayer.chips >= gameContext.currentBet * 2;
      default:
        return true; // Fold is always valid
    }
  };

  return {
    handleBet,
    handleCall,
    handleFold,
    handleCheck,
    handleRaise,
    isValidAction
  };
};