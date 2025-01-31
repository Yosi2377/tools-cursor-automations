import { GameContext, Player } from '@/types/poker';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
      const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'betting')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!game) {
        throw new Error('No active game found');
      }

      // Get the player's data from the game_players table
      const { data: playerData, error: playerQueryError } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', game.id)
        .eq('position', currentPlayer.position)
        .single();

      if (playerQueryError || !playerData) {
        console.error('Error finding player:', playerQueryError);
        throw new Error('Player not found');
      }

      // Check if player has enough chips
      if (playerData.chips < amount) {
        toast.error('Not enough chips to place bet');
        return;
      }

      // Update both current chips and default_chips
      const newChips = playerData.chips - amount;
      const { error: playerError } = await supabase
        .from('game_players')
        .update({
          chips: newChips,
          default_chips: newChips, // Update default_chips as well
          current_bet: playerData.current_bet + amount,
          is_turn: false
        })
        .eq('id', playerData.id);

      if (playerError) {
        console.error('Error updating player:', playerError);
        throw playerError;
      }

      // Also update any other game_players entries for this user that don't have a game_id
      const { error: defaultChipsError } = await supabase
        .from('game_players')
        .update({ 
          chips: newChips,
          default_chips: newChips 
        })
        .eq('user_id', playerData.user_id)
        .is('game_id', null);

      if (defaultChipsError) {
        console.error('Error updating default chips:', defaultChipsError);
        // Don't throw here as this is a secondary update
      }

      // Update game state
      const { error: gameError } = await supabase
        .from('games')
        .update({
          pot: game.pot + amount,
          current_bet: Math.max(game.current_bet, playerData.current_bet + amount),
          current_player_index: (gameContext.currentPlayer + 1) % gameContext.players.length
        })
        .eq('id', game.id);

      if (gameError) {
        console.error('Error updating game:', gameError);
        throw gameError;
      }

      // Update local state
      setGameContext(prev => ({
        ...prev,
        players: prev.players.map(p =>
          p.id === currentPlayer.id
            ? {
                ...p,
                chips: newChips,
                currentBet: p.currentBet + amount,
                isTurn: false
              }
            : p
        ),
        pot: prev.pot + amount,
        currentBet: Math.max(prev.currentBet, currentPlayer.currentBet + amount),
        currentPlayer: (prev.currentPlayer + 1) % prev.players.length
      }));

      toast.success(`${currentPlayer.name} bet ${amount} chips`);
    } catch (error) {
      console.error('Error handling bet:', error);
      toast.error('Failed to place bet');
    }
  };

  const handleFold = async () => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    try {
      // Get the most recent active game
      const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'betting')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!game) {
        throw new Error('No active game found');
      }

      // Get the player's UUID from the game_players table
      const { data: playerData } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('position', currentPlayer.position)
        .single();

      if (!playerData) {
        throw new Error('Player not found');
      }

      // Update player with the correct UUID
      const { error: playerError } = await supabase
        .from('game_players')
        .update({
          is_active: false,
          is_turn: false
        })
        .eq('id', playerData.id);

      if (playerError) throw playerError;

      const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;

      // Update game state
      const { error: gameError } = await supabase
        .from('games')
        .update({
          current_player_index: nextPlayerIndex
        })
        .eq('id', game.id);

      if (gameError) throw gameError;

      setGameContext(prev => ({
        ...prev,
        players: prev.players.map(p =>
          p.id === currentPlayer.id
            ? { ...p, isActive: false, isTurn: false }
            : p
        ),
        currentPlayer: nextPlayerIndex
      }));

      toast(`${currentPlayer.name} folded`);
    } catch (error) {
      console.error('Error handling fold:', error);
      toast('Failed to fold');
    }
  };

  const handleTimeout = () => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    console.log('Timeout triggered for player:', currentPlayer.name);
    
    if (currentPlayer.chips >= gameContext.minimumBet) {
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