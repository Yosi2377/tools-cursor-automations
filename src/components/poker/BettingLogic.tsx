import { GameContext, Player } from '@/types/poker';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { handleOpponentAction } from '@/utils/opponentActions';

export const useBettingLogic = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>,
  dealCommunityCards: (count: number) => any[]
) => {
  const handleBet = async (amount: number) => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    console.log(`${currentPlayer.name} attempting to bet ${amount}`);

    try {
      // Get the most recent active game
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

      // Get the player's UUID from the game_players table
      const { data: playerData, error: playerError } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('position', currentPlayer.position)
        .maybeSingle();

      if (playerError) {
        console.error('Error finding player:', playerError);
        throw playerError;
      }
      
      if (!playerData) {
        console.error('No player found for position:', currentPlayer.position);
        toast.error('Player not found in game');
        return;
      }

      // Update player with the correct UUID
      const { error: playerUpdateError } = await supabase
        .from('game_players')
        .update({
          chips: currentPlayer.chips - amount,
          current_bet: currentPlayer.currentBet + amount,
          is_turn: false
        })
        .eq('id', playerData.id);

      if (playerUpdateError) {
        console.error('Error updating player:', playerUpdateError);
        throw playerUpdateError;
      }

      const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
      const nextPlayer = gameContext.players[nextPlayerIndex];

      // Update game state
      const { error: gameUpdateError } = await supabase
        .from('games')
        .update({
          pot: gameContext.pot + amount,
          current_bet: Math.max(gameContext.currentBet, currentPlayer.currentBet + amount),
          current_player_index: nextPlayerIndex
        })
        .eq('id', game.id);

      if (gameUpdateError) {
        console.error('Error updating game:', gameUpdateError);
        throw gameUpdateError;
      }

      setGameContext(prev => ({
        ...prev,
        players: prev.players.map(p =>
          p.id === currentPlayer.id
            ? {
                ...p,
                chips: p.chips - amount,
                currentBet: p.currentBet + amount,
                isTurn: false
              }
            : p.id === nextPlayer.id
              ? { ...p, isTurn: true }
              : p
        ),
        pot: prev.pot + amount,
        currentBet: Math.max(prev.currentBet, currentPlayer.currentBet + amount),
        currentPlayer: nextPlayerIndex
      }));

      toast.success(`${currentPlayer.name} bet ${amount} chips`);

      // Trigger bot action immediately if next player is a bot
      if (nextPlayer.name.startsWith('Bot')) {
        // Reduced delay for faster bot play
        setTimeout(() => {
          handleOpponentAction(
            nextPlayer,
            {
              ...gameContext,
              currentPlayer: nextPlayerIndex,
              pot: gameContext.pot + amount,
              currentBet: Math.max(gameContext.currentBet, currentPlayer.currentBet + amount)
            },
            handleBet,
            handleFold
          );
        }, Math.random() * 500 + 200); // Faster random delay between 200ms and 700ms
      }
    } catch (error) {
      console.error('Error handling bet:', error);
      toast.error('Failed to place bet');
    }
  };

  const handleFold = async () => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    try {
      // Get the most recent active game
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

      // Get the player's UUID from the game_players table
      const { data: playerData, error: playerError } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('position', currentPlayer.position)
        .maybeSingle();

      if (playerError) {
        console.error('Error finding player:', playerError);
        throw playerError;
      }

      if (!playerData) {
        console.error('No player found for position:', currentPlayer.position);
        toast.error('Player not found in game');
        return;
      }

      // Update player with the correct UUID
      const { error: playerUpdateError } = await supabase
        .from('game_players')
        .update({
          is_active: false,
          is_turn: false
        })
        .eq('id', playerData.id);

      if (playerUpdateError) {
        console.error('Error updating player:', playerUpdateError);
        throw playerUpdateError;
      }

      const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
      const nextPlayer = gameContext.players[nextPlayerIndex];

      // Update game state
      const { error: gameUpdateError } = await supabase
        .from('games')
        .update({
          current_player_index: nextPlayerIndex
        })
        .eq('id', game.id);

      if (gameUpdateError) {
        console.error('Error updating game:', gameUpdateError);
        throw gameUpdateError;
      }

      setGameContext(prev => ({
        ...prev,
        players: prev.players.map(p =>
          p.id === currentPlayer.id
            ? { ...p, isActive: false, isTurn: false }
            : p.id === nextPlayer.id
              ? { ...p, isTurn: true }
              : p
        ),
        currentPlayer: nextPlayerIndex
      }));

      toast.success(`${currentPlayer.name} folded`);

      // Trigger bot action immediately if next player is a bot
      if (nextPlayer.name.startsWith('Bot')) {
        // Reduced delay for faster bot play
        setTimeout(() => {
          handleOpponentAction(
            nextPlayer,
            {
              ...gameContext,
              currentPlayer: nextPlayerIndex
            },
            handleBet,
            handleFold
          );
        }, Math.random() * 500 + 200); // Faster random delay between 200ms and 700ms
      }
    } catch (error) {
      console.error('Error handling fold:', error);
      toast.error('Failed to fold');
    }
  };

  const handleTimeout = () => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    console.log('Timeout triggered for player:', currentPlayer.name);
    
    // If it's a bot's turn, trigger the bot action immediately
    if (currentPlayer.name.startsWith('Bot')) {
      handleOpponentAction(
        currentPlayer,
        gameContext,
        handleBet,
        handleFold
      );
    } else if (currentPlayer.chips >= gameContext.minimumBet) {
      handleBet(gameContext.minimumBet);
    } else {
      handleFold();
    }
  };

  return {
    handleBet,
    handleFold,
    handleTimeout
  };
};