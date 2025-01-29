import { GameContext, Player } from '@/types/poker';

export const handleOpponentAction = (
  player: Player,
  gameContext: GameContext,
  handleBet: (amount: number) => void,
  handleFold: () => void
) => {
  console.log('Opponent action for:', player.name);
  
  // Always bet in the first round to ensure the flop is dealt
  const isFirstRound = gameContext.communityCards.length === 0;
  const shouldBet = isFirstRound || Math.random() < 0.7;
  
  if (shouldBet && player.chips >= gameContext.currentBet) {
    setTimeout(() => {
      handleBet(gameContext.currentBet);
    }, 1000);
  } else {
    setTimeout(() => {
      handleFold();
    }, 1000);
  }
};