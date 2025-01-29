import { GameContext, Card } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';
import { placeBet, fold } from '@/utils/pokerLogic';
import { calculateRake } from '@/utils/rakeCalculator';
import { handleGameEnd } from '@/utils/gameEndHandler';
import { handleOpponentAction } from '@/utils/opponentActions';
import { checkAndDealCommunityCards } from '@/utils/communityCardHandler';

export const useBettingLogic = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>,
  dealCommunityCards: (count: number) => Card[]
) => {
  const handleTimeout = () => {
    console.log('Timeout triggered for player:', gameContext.players[gameContext.currentPlayer].name);
    handleFold();
  };

  const handleBet = (amount: number) => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    
    if (currentPlayer.chips < amount) {
      toast({
        title: "Invalid bet",
        description: "You don't have enough chips",
        variant: "destructive",
      });
      return;
    }

    const rake = calculateRake(amount);
    const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
    const updatedContext = placeBet(gameContext, currentPlayer.id, amount);
    
    setGameContext(prev => ({
      ...updatedContext,
      currentPlayer: nextPlayerIndex,
      rake: (prev.rake || 0) + rake,
      pot: updatedContext.pot - rake,
      players: updatedContext.players.map((p, i) => ({
        ...p,
        isTurn: i === nextPlayerIndex && p.isActive
      }))
    }));

    toast({
      title: "Bet placed",
      description: `${currentPlayer.name} bet ${amount} chips (Rake: ${rake} chips)`,
    });
    
    const shouldDealCards = checkAndDealCommunityCards(updatedContext, dealCommunityCards, setGameContext);
    console.log('Should deal cards:', shouldDealCards);

    // If next player is not the bottom player (human) and we're not dealing cards, trigger opponent action
    if (!shouldDealCards && nextPlayerIndex !== 0) {
      const nextPlayer = updatedContext.players[nextPlayerIndex];
      if (nextPlayer.isActive) {
        console.log('Triggering opponent action for:', nextPlayer.name);
        setTimeout(() => {
          handleOpponentAction(
            nextPlayer,
            updatedContext,
            handleBet,
            handleFold
          );
        }, 1500);
      }
    }
  };

  const handleFold = () => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
    
    setGameContext(prev => {
      const updatedContext = fold(prev, currentPlayer.id);
      const activePlayers = updatedContext.players.filter(p => p.isActive);

      if (activePlayers.length === 1) {
        return handleGameEnd(
          activePlayers[0],
          updatedContext.pot,
          updatedContext.rake,
          updatedContext.players,
          prev.dealerPosition
        );
      }

      return {
        ...updatedContext,
        currentPlayer: nextPlayerIndex,
        players: updatedContext.players.map((p, i) => ({
          ...p,
          isTurn: i === nextPlayerIndex && p.isActive
        }))
      };
    });

    toast({
      title: "Player folded",
      description: `${currentPlayer.name} has folded`,
    });

    // If next player is not the bottom player (human), trigger opponent action
    if (nextPlayerIndex !== 0) {
      const nextPlayer = gameContext.players[nextPlayerIndex];
      if (nextPlayer.isActive) {
        console.log('Triggering opponent action after fold for:', nextPlayer.name);
        setTimeout(() => {
          handleOpponentAction(
            nextPlayer,
            gameContext,
            handleBet,
            handleFold
          );
        }, 1500);
      }
    }
  };

  return {
    handleBet,
    handleFold,
    handleTimeout,
  };
};