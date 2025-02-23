import { GameContext } from '@/types/poker';
import { handleOpponentAction } from './opponentActions';

export const simulateOpponentAction = async (
  gameContext: GameContext,
  nextPlayer: any,
  handleBet: (amount: number) => Promise<void>,
  handlePlayerFold: () => Promise<void>
) => {
  console.log('Simulating opponent action for:', nextPlayer.name);
  
  // Use the immediate action handler instead of delayed behavior
  await handleOpponentAction(
    nextPlayer,
    gameContext,
    handleBet,
    handlePlayerFold
  );
};