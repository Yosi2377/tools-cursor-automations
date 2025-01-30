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
    
    // Skip if player has already matched the current bet
    if (currentPlayer.currentBet === gameContext.currentBet && amount === gameContext.currentBet) {
      console.log('Player has already matched the current bet, skipping');
      return;
    }

    // Check if player can afford the bet
    if (currentPlayer.chips < amount) {
      toast({
        title: "Invalid bet",
        description: `${currentPlayer.name} doesn't have enough chips`,
      });
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
        setTimeout(() => {
          const amountToCall = updatedContext.currentBet - nextPlayer.currentBet;
          console.log(`${nextPlayer.name}'s turn - Current bet: ${updatedContext.currentBet}, Amount to call: ${amountToCall}`);
          
          // Opponent decision logic
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

    // Trigger next opponent action if needed
    if (nextPlayerIndex !== 0) {
      const nextPlayer = updatedContext.players[nextPlayerIndex];
      if (nextPlayer.isActive) {
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