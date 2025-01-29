import { GameContext, Player } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';

export const handleOpponentAction = (
  currentPlayer: Player,
  gameContext: GameContext,
  handleBet: (amount: number) => void,
  handleFold: () => void
) => {
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