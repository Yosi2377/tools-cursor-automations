import { GameContext, Card } from '@/types/poker';
import { checkAndDealCommunityCards } from '@/utils/communityCardHandler';
import { handleOpponentAction } from '@/utils/opponentActions';
import { placeBet } from '@/utils/betActions';
import { handleFold } from '@/utils/foldActions';

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
    console.log(`${currentPlayer.name} betting ${amount}`);
    
    // Check if the player has already bet this amount
    if (currentPlayer.currentBet === amount && amount > 0) {
      console.log('Player has already bet this amount, skipping');
      return;
    }
    
    const updatedContext = placeBet(gameContext, currentPlayer, amount, setGameContext);
    if (!updatedContext) return;

    const nextPlayerIndex = updatedContext.currentPlayer;
    
    setGameContext(prev => ({
      ...prev,
      ...updatedContext,
      players: updatedContext.players.map((p, i) => ({
        ...p,
        isTurn: i === nextPlayerIndex && p.isActive
      }))
    }));
    
    // Check if we should deal community cards
    const shouldDealCards = checkAndDealCommunityCards(updatedContext, dealCommunityCards, setGameContext);
    
    // If we didn't deal cards and it's not the human player's turn, trigger opponent action
    if (!shouldDealCards && nextPlayerIndex !== 0) {
      const nextPlayer = updatedContext.players[nextPlayerIndex];
      if (nextPlayer.isActive) {
        console.log('Triggering opponent action for:', nextPlayer.name);
        // Add a delay before the next opponent action
        setTimeout(() => {
          const amountToCall = updatedContext.currentBet - nextPlayer.currentBet;
          if (amountToCall > 0 && nextPlayer.chips >= amountToCall) {
            handleBet(amountToCall);
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
    const nextPlayerIndex = updatedContext.currentPlayer;
    
    setGameContext(prev => ({
      ...prev,
      ...updatedContext,
      players: updatedContext.players.map((p, i) => ({
        ...p,
        isTurn: i === nextPlayerIndex && p.isActive
      }))
    }));

    if (nextPlayerIndex !== 0) {
      const nextPlayer = updatedContext.players[nextPlayerIndex];
      if (nextPlayer.isActive) {
        console.log('Triggering opponent action after fold for:', nextPlayer.name);
        setTimeout(() => {
          const amountToCall = updatedContext.currentBet - nextPlayer.currentBet;
          if (amountToCall > 0 && nextPlayer.chips >= amountToCall) {
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