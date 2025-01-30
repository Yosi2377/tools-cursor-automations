import { GameContext, Card } from '@/types/poker';
import { checkAndDealCommunityCards } from '@/utils/communityCardHandler';
import { handleOpponentAction } from '@/utils/opponentActions';
import { placeBet } from '@/utils/betActions';
import { handleFold } from '@/utils/foldActions';
import { toast } from '@/hooks/use-toast';

export const useBettingLogic = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>,
  dealCommunityCards: (count: number) => Card[]
) => {
  const handleTimeout = () => {
    console.log('Timeout triggered for player:', gameContext.players[gameContext.currentPlayer].name);
    handleBet(gameContext.currentBet);
  };

  const handleBet = (amount: number) => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    console.log(`${currentPlayer.name} attempting to bet ${amount}`);
    
    // Calculate the actual amount needed to call
    const amountToCall = gameContext.currentBet - currentPlayer.currentBet;
    const actualBetAmount = Math.max(amountToCall, amount);

    // Validate bet amount
    if (currentPlayer.chips < actualBetAmount) {
      toast({
        title: "Invalid bet",
        description: `${currentPlayer.name} doesn't have enough chips`,
      });
      return;
    }

    const updatedContext = placeBet(gameContext, currentPlayer, actualBetAmount, setGameContext);
    if (!updatedContext) return;

    // Find next active player
    let nextPlayerIndex = updatedContext.currentPlayer;
    while (
      !updatedContext.players[nextPlayerIndex].isActive ||
      updatedContext.players[nextPlayerIndex].currentBet === updatedContext.currentBet
    ) {
      nextPlayerIndex = (nextPlayerIndex + 1) % updatedContext.players.length;
      
      // If we've gone full circle, break
      if (nextPlayerIndex === gameContext.currentPlayer) {
        break;
      }
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

    // Check if we should deal community cards
    const shouldDealCards = checkAndDealCommunityCards(
      { ...updatedContext, currentPlayer: nextPlayerIndex },
      dealCommunityCards,
      setGameContext
    );
    
    // If we didn't deal cards and it's not the human player's turn, trigger opponent action
    if (!shouldDealCards && nextPlayerIndex !== 0) {
      const nextPlayer = updatedContext.players[nextPlayerIndex];
      if (nextPlayer.isActive) {
        setTimeout(() => {
          const nextAmountToCall = updatedContext.currentBet - nextPlayer.currentBet;
          console.log(`${nextPlayer.name}'s turn - Current bet: ${updatedContext.currentBet}, Amount to call: ${nextAmountToCall}`);
          
          // Opponent decision logic - 70% chance to call, 30% to fold
          if (Math.random() < 0.7 && nextPlayer.chips >= nextAmountToCall) {
            handleBet(nextAmountToCall);
          } else {
            handlePlayerFold();
          }
        }, 1500);
      }
    }
  };

  const handlePlayerFold = () => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    console.log(`${currentPlayer.name} folding`);
    
    const updatedContext = handleFold(gameContext, currentPlayer, setGameContext);
    if (!updatedContext) return;

    // Find next active player
    let nextPlayerIndex = updatedContext.currentPlayer;
    while (!updatedContext.players[nextPlayerIndex].isActive) {
      nextPlayerIndex = (nextPlayerIndex + 1) % updatedContext.players.length;
      
      // If we've gone full circle, break
      if (nextPlayerIndex === gameContext.currentPlayer) {
        break;
      }
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

    // Trigger next opponent action if needed
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
  };

  return {
    handleBet,
    handleFold: handlePlayerFold,
    handleTimeout,
  };
};