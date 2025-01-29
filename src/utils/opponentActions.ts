import { GameContext, Player } from '@/types/poker';

export const handleOpponentAction = (
  player: Player,
  gameContext: GameContext,
  handleBet: (amount: number) => void,
  handleFold: () => void
) => {
  console.log('Opponent action for:', player.name);
  
  // Randomly decide to bet or fold with 70% chance to bet
  const shouldBet = Math.random() < 0.7;
  
  if (shouldBet && player.chips >= gameContext.currentBet) {
    // Match the current bet
    setTimeout(() => {
      handleBet(gameContext.currentBet);
    }, 1000);
  } else {
    // Fold if can't match bet or randomly decided to fold
    setTimeout(() => {
      handleFold();
    }, 1000);
  }
};