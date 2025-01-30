import { GameContext, Card } from '@/types/poker';
import { checkAndDealCommunityCards } from '@/utils/communityCardHandler';
import { handleOpponentAction } from '@/utils/opponentActions';
import { placeBet } from '@/utils/betActions';
import { handleFold } from '@/utils/foldActions';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useBettingLogic = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>,
  dealCommunityCards: (count: number) => Card[]
) => {
  const handleTimeout = () => {
    console.log('Timeout triggered for player:', gameContext.players[gameContext.currentPlayer].name);
    handleBet(gameContext.currentBet);
  };

  const handleBet = async (amount: number) => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    console.log(`${currentPlayer.name} attempting to bet ${amount}`);
    
    const amountToCall = gameContext.currentBet - currentPlayer.currentBet;
    const actualBetAmount = Math.max(amountToCall, amount);

    if (currentPlayer.chips < actualBetAmount) {
      toast({
        title: "Invalid bet",
        description: `${currentPlayer.name} doesn't have enough chips`,
      });
      return;
    }

    try {
      // Update player's bet in Supabase
      const { error: playerError } = await supabase
        .from('game_players')
        .update({
          chips: currentPlayer.chips - actualBetAmount,
          current_bet: currentPlayer.currentBet + actualBetAmount,
          is_turn: false
        })
        .eq('id', currentPlayer.id);

      if (playerError) throw playerError;

      // Update game state in Supabase
      const { error: gameError } = await supabase
        .from('games')
        .update({
          pot: gameContext.pot + actualBetAmount,
          current_bet: Math.max(gameContext.currentBet, currentPlayer.currentBet + actualBetAmount),
          current_player_index: (gameContext.currentPlayer + 1) % gameContext.players.length
        })
        .eq('status', 'betting');

      if (gameError) throw gameError;

      const updatedContext = placeBet(gameContext, currentPlayer, actualBetAmount, setGameContext);
      if (!updatedContext) return;

      let nextPlayerIndex = updatedContext.currentPlayer;
      while (
        !updatedContext.players[nextPlayerIndex].isActive ||
        updatedContext.players[nextPlayerIndex].currentBet === updatedContext.currentBet
      ) {
        nextPlayerIndex = (nextPlayerIndex + 1) % updatedContext.players.length;
        if (nextPlayerIndex === gameContext.currentPlayer) break;
      }
      
      setGameContext(prev => ({
        ...prev,
        ...updatedContext,
        currentPlayer: nextPlayerIndex,
        players: updatedContext.players.map((p, i) => ({
          ...p,
          isTurn: i === nextPlayerIndex && p.isActive
        }))
      }));

      const shouldDealCards = checkAndDealCommunityCards(
        { ...updatedContext, currentPlayer: nextPlayerIndex },
        dealCommunityCards,
        setGameContext
      );
      
      if (!shouldDealCards && nextPlayerIndex !== 0) {
        const nextPlayer = updatedContext.players[nextPlayerIndex];
        if (nextPlayer.isActive) {
          setTimeout(() => {
            const nextAmountToCall = updatedContext.currentBet - nextPlayer.currentBet;
            console.log(`${nextPlayer.name}'s turn - Current bet: ${updatedContext.currentBet}, Amount to call: ${nextAmountToCall}`);
            
            if (Math.random() < 0.7 && nextPlayer.chips >= nextAmountToCall) {
              handleBet(nextAmountToCall);
            } else {
              handlePlayerFold();
            }
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error handling bet:', error);
      toast({
        title: "Error",
        description: "Failed to place bet",
        variant: "destructive"
      });
    }
  };

  const handlePlayerFold = async () => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    console.log(`${currentPlayer.name} folding`);
    
    try {
      // Update player state in Supabase
      const { error: playerError } = await supabase
        .from('game_players')
        .update({
          is_active: false,
          is_turn: false
        })
        .eq('id', currentPlayer.id);

      if (playerError) throw playerError;

      const updatedContext = handleFold(gameContext, currentPlayer, setGameContext);
      if (!updatedContext) return;

      let nextPlayerIndex = updatedContext.currentPlayer;
      while (!updatedContext.players[nextPlayerIndex].isActive) {
        nextPlayerIndex = (nextPlayerIndex + 1) % updatedContext.players.length;
        if (nextPlayerIndex === gameContext.currentPlayer) break;
      }
      
      // Update game state in Supabase
      const { error: gameError } = await supabase
        .from('games')
        .update({
          current_player_index: nextPlayerIndex
        })
        .eq('status', 'betting');

      if (gameError) throw gameError;

      setGameContext(prev => ({
        ...prev,
        ...updatedContext,
        currentPlayer: nextPlayerIndex,
        players: updatedContext.players.map((p, i) => ({
          ...p,
          isTurn: i === nextPlayerIndex && p.isActive
        }))
      }));

      if (nextPlayerIndex !== 0) {
        const nextPlayer = updatedContext.players[nextPlayerIndex];
        if (nextPlayer.isActive) {
          setTimeout(() => {
            const amountToCall = updatedContext.currentBet - nextPlayer.currentBet;
            if (Math.random() < 0.7 && nextPlayer.chips >= amountToCall) {
              handleBet(amountToCall);
            } else {
              handlePlayerFold();
            }
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error handling fold:', error);
      toast({
        title: "Error",
        description: "Failed to fold",
        variant: "destructive"
      });
    }
  };

  return {
    handleBet,
    handleFold: handlePlayerFold,
    handleTimeout,
  };
};