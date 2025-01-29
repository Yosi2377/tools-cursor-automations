import { GameContext, Player } from '@/types/poker';

export const handleOpponentAction = (
  player: Player,
  gameContext: GameContext,
  handleBet: (amount: number) => void,
  handleFold: () => void
) => {
  console.log('Opponent action for:', player.name, 'Current bet:', gameContext.currentBet, 'Player bet:', player.currentBet);
  
  // Always bet in the first round to ensure the flop is dealt
  const isFirstRound = gameContext.communityCards.length === 0;
  const shouldBet = isFirstRound || Math.random() < 0.7;
  
  const amountToCall = gameContext.currentBet - player.currentBet;
  
  if (shouldBet && player.chips >= amountToCall) {
    setTimeout(() => {
      console.log(`${player.name} betting ${amountToCall}`);
      handleBet(amountToCall);
    }, 1000);
  } else {
    setTimeout(() => {
      console.log(`${player.name} folding`);
      handleFold();
    }, 1000);
  }
};