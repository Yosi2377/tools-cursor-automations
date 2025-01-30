import { GameContext } from '@/types/poker';

export const simulateOpponentAction = (
  gameContext: GameContext,
  nextPlayer: any,
  handleBet: (amount: number) => void,
  handlePlayerFold: () => void
) => {
  const amountToCall = gameContext.currentBet - nextPlayer.currentBet;
  if (Math.random() < 0.7 && nextPlayer.chips >= amountToCall) {
    handleBet(amountToCall);
  } else {
    handlePlayerFold();
  }
};