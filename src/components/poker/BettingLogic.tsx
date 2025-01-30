import { GameContext, Card } from '@/types/poker';
import { checkAndDealCommunityCards } from '@/utils/communityCardHandler';
import { placeBet } from '@/utils/betActions';
import { handleFold } from '@/utils/foldActions';
import { toast } from '@/hooks/use-toast';
import { updatePlayerBet, updateGameState, handlePlayerFoldUpdate, updateGameStateAfterFold } from '@/utils/betHandlers';
import { simulateOpponentAction } from '@/utils/opponentBehavior';

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
      await updatePlayerBet(currentPlayer, actualBetAmount);
      await updateGameState(gameContext, actualBetAmount, currentPlayer);

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
            simulateOpponentAction(updatedContext, nextPlayer, handleBet, handlePlayerFold);
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
      await handlePlayerFoldUpdate(currentPlayer);

      const updatedContext = handleFold(gameContext, currentPlayer, setGameContext);
      if (!updatedContext) return;

      let nextPlayerIndex = updatedContext.currentPlayer;
      while (!updatedContext.players[nextPlayerIndex].isActive) {
        nextPlayerIndex = (nextPlayerIndex + 1) % updatedContext.players.length;
        if (nextPlayerIndex === gameContext.currentPlayer) break;
      }
      
      await updateGameStateAfterFold(nextPlayerIndex);

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
            simulateOpponentAction(updatedContext, nextPlayer, handleBet, handlePlayerFold);
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