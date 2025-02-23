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

    if (currentPlayer.chips < amount) {
      toast.error("Not enough chips to make this bet");
      return;
    }

    try {
      // Get the most recent active game with retries
      let retries = 3;
      let game = null;
      let gameError = null;

      while (retries > 0 && !game) {
        const result = await supabase
          .from('games')
          .select('*')
          .eq('status', 'betting')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (result.error) {
          console.error(`Attempt ${4-retries}: Error fetching game:`, result.error);
          gameError = result.error;
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        } else {
          game = result.data;
          break;
        }
      }

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

      // Update next player's turn
      const { data: nextPlayerData } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('position', nextPlayer.position)
        .maybeSingle();

      if (nextPlayerData) {
        await supabase
          .from('game_players')
          .update({ is_turn: true })
          .eq('id', nextPlayerData.id);
      }

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

      const updatedGameContext = {
        ...gameContext,
        players: gameContext.players.map(p =>
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
        pot: gameContext.pot + amount,
        currentBet: Math.max(gameContext.currentBet, currentPlayer.currentBet + amount),
        currentPlayer: nextPlayerIndex
      };

      setGameContext(updatedGameContext);
      toast.success(`${currentPlayer.name} bet ${amount} chips`);

      // Trigger bot action immediately if next player is a bot
      if (nextPlayer.name.startsWith('Bot')) {
        console.log('Preparing bot action:', {
          botName: nextPlayer.name,
          botChips: nextPlayer.chips,
          botCurrentBet: nextPlayer.currentBet,
          gameCurrentBet: updatedGameContext.currentBet,
          gameMinimumBet: updatedGameContext.minimumBet,
          gamePot: updatedGameContext.pot,
          communityCards: updatedGameContext.communityCards
        });

        let retries = 3;
        while (retries > 0) {
          try {
            if (!nextPlayer.isActive) {
              console.log('Bot is not active, skipping turn');
              break;
            }
            await handleOpponentAction(
              nextPlayer,
              updatedGameContext,
              handleBet,
              () => handleFold(nextPlayer)
            );
            break;
          } catch (error) {
            console.error(`Error in bot action (${retries} retries left):`, error);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            toast.error('Bot failed to act after multiple attempts');
            // Force fold on complete failure
            await handleFold(nextPlayer);
          }
        }
      }
    } catch (error) {
      console.error('Error handling bet:', error);
      toast.error('Failed to place bet. Please try again.');
    }
  };

  const handleFold = async (player: Player) => {
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
        .eq('position', player.position)
        .maybeSingle();

      if (playerError) {
        console.error('Error finding player:', playerError);
        throw playerError;
      }

      if (!playerData) {
        console.error('No player found for position:', player.position);
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

      // Update next player's turn
      const { data: nextPlayerData } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('position', nextPlayer.position)
        .maybeSingle();

      if (nextPlayerData) {
        await supabase
          .from('game_players')
          .update({ is_turn: true })
          .eq('id', nextPlayerData.id);
      }

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

      const updatedGameContext = {
        ...gameContext,
        players: gameContext.players.map(p =>
          p.id === player.id
            ? { ...p, isActive: false, isTurn: false }
            : p.id === nextPlayer.id
              ? { ...p, isTurn: true }
              : p
        ),
        currentPlayer: nextPlayerIndex
      };

      setGameContext(updatedGameContext);
      toast.success(`${player.name} folded`);

      // Trigger bot action immediately if next player is a bot
      if (nextPlayer.name.startsWith('Bot')) {
        console.log('Preparing bot action:', {
          botName: nextPlayer.name,
          botChips: nextPlayer.chips,
          botCurrentBet: nextPlayer.currentBet,
          gameCurrentBet: updatedGameContext.currentBet,
          gameMinimumBet: updatedGameContext.minimumBet,
          gamePot: updatedGameContext.pot,
          communityCards: updatedGameContext.communityCards
        });

        let retries = 3;
        while (retries > 0) {
          try {
            if (!nextPlayer.isActive) {
              console.log('Bot is not active, skipping turn');
              break;
            }
            await handleOpponentAction(
              nextPlayer,
              updatedGameContext,
              handleBet,
              () => handleFold(nextPlayer)
            );
            break;
          } catch (error) {
            console.error(`Error in bot action (${retries} retries left):`, error);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            toast.error('Bot failed to act after multiple attempts');
            // Force fold on complete failure
            await handleFold(nextPlayer);
          }
        }
      }
    } catch (error) {
      console.error('Error handling fold:', error);
      toast.error('Failed to fold');
    }
  };

  return {
    handleBet,
    handleFold
  };
};