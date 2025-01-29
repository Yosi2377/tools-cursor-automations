import { GameContext, Card } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';
import { placeBet, fold } from '@/utils/pokerLogic';
import { calculateRake } from '@/utils/rakeCalculator';
import { handleGameEnd } from '@/utils/gameEndHandler';
import { dealCommunityCardsForStage } from '@/utils/communityCardDealer';

export const useBettingLogic = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>,
  dealCommunityCards: (count: number) => Card[]
) => {
  const handleTimeout = () => {
    handleFold();
    toast({
      title: "Time's up!",
      description: `${gameContext.players[gameContext.currentPlayer].name} took too long and folded`,
      variant: "destructive",
    });
  };

  const handleOpponentAction = () => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    
    // Randomly decide to bet or fold
    const shouldFold = Math.random() < 0.3; // 30% chance to fold
    
    if (shouldFold) {
      handleFold();
      toast({
        title: "Player action",
        description: `${currentPlayer.name} folds`,
      });
    } else {
      const minBet = Math.max(gameContext.minimumBet, gameContext.currentBet);
      handleBet(minBet);
    }
  };

  const checkAndDealCommunityCards = (updatedContext: GameContext) => {
    const activePlayers = updatedContext.players.filter(p => p.isActive);
    const allPlayersActed = activePlayers.every(p => 
      !p.isActive || p.currentBet === updatedContext.currentBet
    );

    if (allPlayersActed && activePlayers.length > 1) {
      toast({
        title: "Dealing cards...",
        description: "Get ready for the next round!",
      });

      setTimeout(() => {
        setGameContext(prev => {
          const { newCards, updatedContext } = dealCommunityCardsForStage(prev, dealCommunityCards);
          return {
            ...prev,
            ...updatedContext,
            players: prev.players.map(p => ({
              ...p,
              currentBet: 0
            })),
            currentBet: prev.minimumBet
          };
        });
      }, 500);
      return true;
    }
    return false;
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
    
    const shouldDealCards = checkAndDealCommunityCards(updatedContext);

    // If next player is not the bottom player (human), trigger opponent action
    const activePlayers = updatedContext.players.filter(p => p.isActive);
    if (!shouldDealCards && nextPlayerIndex !== 0 && activePlayers.length > 1) {
      setTimeout(() => {
        handleOpponentAction();
      }, 1500); // Add delay for more natural gameplay
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
    const activePlayers = gameContext.players.filter(p => p.isActive);
    if (nextPlayerIndex !== 0 && activePlayers.length > 1) {
      setTimeout(() => {
        handleOpponentAction();
      }, 1500); // Add delay for more natural gameplay
    }
  };

  return {
    handleBet,
    handleFold,
    handleTimeout,
  };
};