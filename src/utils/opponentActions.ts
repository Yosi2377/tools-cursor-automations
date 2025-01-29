import { GameContext, Player } from '@/types/poker';

export const handleOpponentAction = (
  player: Player,
  gameContext: GameContext,
  handleBet: (amount: number) => void,
  handleFold: () => void
) => {
  console.log('Opponent action for:', player.name);
  
  // Randomly decide to bet or fold with 70% chance to bet
  const shouldFold = Math.random() < 0.3;
  
  if (shouldFold) {
    handleFold();
  } else {
    const minBet = Math.max(gameContext.minimumBet, gameContext.currentBet);
    handleBet(minBet);
  }
};