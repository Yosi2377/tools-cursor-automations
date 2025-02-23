import { useCallback, useMemo, useRef } from 'react';
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
  const prevGameContextRef = useRef<GameContext>(gameContext);

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

      const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;

      // Update player state in database
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

      // Update next player's turn
      const { error: nextPlayerError } = await supabase
        .from('game_players')
        .update({ is_turn: true })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', gameContext.players[nextPlayerIndex].id);

      if (nextPlayerError) throw nextPlayerError;

      // Update game state in database
      const { error: gameError } = await supabase
        .from('games')
        .update({
          current_bet: amount,
          pot: gameContext.pot + amount,
          current_player_index: nextPlayerIndex
        })
        .eq('id', gameContext.gameId);

      if (gameError) throw gameError;

      // Only update state if game context has changed
      if (JSON.stringify(gameContext) !== JSON.stringify(prevGameContextRef.current)) {
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
              : player.id === prev.players[nextPlayerIndex].id
                ? { ...player, isTurn: true }
                : player
          );

          return {
            ...prev,
            currentBet: amount,
            pot: prev.pot + amount,
            currentPlayer: nextPlayerIndex,
            players: updatedPlayers
          };
        });
        prevGameContextRef.current = gameContext;
      }

      toast.success(`Bet placed: $${amount}`);
    } catch (error) {
      console.error('Error handling bet:', error);
      toast.error('Failed to place bet');
    }
  }, [gameContext, currentPlayer, updateGameState]);

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

      const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;

      // Update player state in database
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

      // Update next player's turn
      const { error: nextPlayerError } = await supabase
        .from('game_players')
        .update({ is_turn: true })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', gameContext.players[nextPlayerIndex].id);

      if (nextPlayerError) throw nextPlayerError;

      // Update game state in database
      const { error: gameError } = await supabase
        .from('games')
        .update({
          pot: gameContext.pot + callAmount,
          current_player_index: nextPlayerIndex
        })
        .eq('id', gameContext.gameId);

      if (gameError) throw gameError;

      // Only update state if game context has changed
      if (JSON.stringify(gameContext) !== JSON.stringify(prevGameContextRef.current)) {
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
              : player.id === prev.players[nextPlayerIndex].id
                ? { ...player, isTurn: true }
                : player
          );

          return {
            ...prev,
            pot: prev.pot + callAmount,
            currentPlayer: nextPlayerIndex,
            players: updatedPlayers
          };
        });
        prevGameContextRef.current = gameContext;
      }

      toast.success(`Called: $${callAmount}`);
    } catch (error) {
      console.error('Error handling call:', error);
      toast.error('Failed to call');
    }
  }, [gameContext, currentPlayer, updateGameState]);

  const handleFold = useCallback(async (): Promise<void> => {
    try {
      if (!currentPlayer) {
        toast.error('No active player found');
        return;
      }

      const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;

      // Update player state in database
      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          is_active: false,
          is_turn: false,
          has_acted: true,
          has_folded: true,
          last_action: 'fold'
        })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', currentPlayer.id);

      if (updateError) throw updateError;

      // Update next player's turn
      const { error: nextPlayerError } = await supabase
        .from('game_players')
        .update({ is_turn: true })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', gameContext.players[nextPlayerIndex].id);

      if (nextPlayerError) throw nextPlayerError;

      // Update game state in database
      const { error: gameError } = await supabase
        .from('games')
        .update({
          current_player_index: nextPlayerIndex
        })
        .eq('id', gameContext.gameId);

      if (gameError) throw gameError;

      // Only update state if game context has changed
      if (JSON.stringify(gameContext) !== JSON.stringify(prevGameContextRef.current)) {
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
              : player.id === prev.players[nextPlayerIndex].id
                ? { ...player, isTurn: true }
                : player
          );

          return {
            ...prev,
            currentPlayer: nextPlayerIndex,
            players: updatedPlayers
          };
        });
        prevGameContextRef.current = gameContext;
      }

      toast.success('Folded');
    } catch (error) {
      console.error('Error handling fold:', error);
      toast.error('Failed to fold');
    }
  }, [gameContext, currentPlayer, updateGameState]);

  const handleCheck = useCallback(async (): Promise<void> => {
    try {
      if (!currentPlayer) {
        toast.error('No active player found');
        return;
      }

      const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;

      // Update player state in database
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

      // Update next player's turn
      const { error: nextPlayerError } = await supabase
        .from('game_players')
        .update({ is_turn: true })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', gameContext.players[nextPlayerIndex].id);

      if (nextPlayerError) throw nextPlayerError;

      // Update game state in database
      const { error: gameError } = await supabase
        .from('games')
        .update({
          current_player_index: nextPlayerIndex
        })
        .eq('id', gameContext.gameId);

      if (gameError) throw gameError;

      // Only update state if game context has changed
      if (JSON.stringify(gameContext) !== JSON.stringify(prevGameContextRef.current)) {
        updateGameState(prev => {
          const updatedPlayers = prev.players.map(player =>
            player.id === currentPlayer.id
              ? {
                  ...player,
                  hasActed: true,
                  lastAction: 'check',
                  isTurn: false
                }
              : player.id === prev.players[nextPlayerIndex].id
                ? { ...player, isTurn: true }
                : player
          );

          return {
            ...prev,
            currentPlayer: nextPlayerIndex,
            players: updatedPlayers
          };
        });
        prevGameContextRef.current = gameContext;
      }

      toast.success('Checked');
    } catch (error) {
      console.error('Error handling check:', error);
      toast.error('Failed to check');
    }
  }, [gameContext, currentPlayer, updateGameState]);

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

      const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;

      // Update player state in database
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

      // Update next player's turn
      const { error: nextPlayerError } = await supabase
        .from('game_players')
        .update({ is_turn: true })
        .eq('game_id', gameContext.gameId)
        .eq('user_id', gameContext.players[nextPlayerIndex].id);

      if (nextPlayerError) throw nextPlayerError;

      // Update game state in database
      const { error: gameError } = await supabase
        .from('games')
        .update({
          current_bet: minRaise,
          pot: gameContext.pot + (minRaise - (currentPlayer.currentBet || 0)),
          current_player_index: nextPlayerIndex
        })
        .eq('id', gameContext.gameId);

      if (gameError) throw gameError;

      // Only update state if game context has changed
      if (JSON.stringify(gameContext) !== JSON.stringify(prevGameContextRef.current)) {
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
              : player.id === prev.players[nextPlayerIndex].id
                ? { ...player, isTurn: true }
                : player
          );

          return {
            ...prev,
            currentBet: minRaise,
            pot: prev.pot + (minRaise - (currentPlayer.currentBet || 0)),
            currentPlayer: nextPlayerIndex,
            players: updatedPlayers
          };
        });
        prevGameContextRef.current = gameContext;
      }

      toast.success(`Raised to: $${minRaise}`);
    } catch (error) {
      console.error('Error handling raise:', error);
      toast.error('Failed to raise');
    }
  }, [gameContext, currentPlayer, updateGameState]);

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