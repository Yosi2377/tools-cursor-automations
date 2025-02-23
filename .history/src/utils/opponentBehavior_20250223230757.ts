import { GameContext } from '@/types/poker';
import { handleOpponentAction } from './opponentActions';

export const simulateOpponentAction = (
  gameContext: GameContext,
  nextPlayer: any,
  handleBet: (amount: number) => void,
  handlePlayerFold: () => void
) => {
  console.log('Simulating opponent action for:', nextPlayer.name);
  
  // Use the immediate action handler instead of delayed behavior
  handleOpponentAction(
    nextPlayer,
    gameContext,
    handleBet,
    handlePlayerFold
  );
};