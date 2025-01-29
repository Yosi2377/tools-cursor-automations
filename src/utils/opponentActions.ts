import { GameContext, Player } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';

export const handleOpponentAction = (
  currentPlayer: Player,
  gameContext: GameContext,
  handleBet: (amount: number) => void,
  handleFold: () => void
) => {
  console.log('Opponent action for:', currentPlayer.name);
  
  // Randomly decide to bet or fold with 70% chance to bet
  const shouldFold = Math.random() < 0.3;
  
  if (shouldFold) {
    handleFold();
    toast({
      title: "Player action",
      description: `${currentPlayer.name} folds`,
    });
  } else {
    const minBet = Math.max(gameContext.minimumBet, gameContext.currentBet);
    handleBet(minBet);
    toast({
      title: "Player action",
      description: `${currentPlayer.name} bets ${minBet} chips`,
    });
  }
};