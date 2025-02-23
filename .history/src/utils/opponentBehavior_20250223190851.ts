import { Player, GameContext } from '@/types/poker';

type BetHandler = (amount: number) => Promise<void>;
type FoldHandler = () => Promise<void>;

export const handleOpponentAction = (
  currentPlayer: Player,
  gameContext: GameContext,
  handleBet: BetHandler,
  handleFold: FoldHandler
): void => {
  // Simple bot logic - randomly choose between betting and folding
  const randomAction = Math.random();
  const minBet = gameContext.minimumBet;
  const currentBet = gameContext.currentBet;
  const callAmount = currentBet - currentPlayer.currentBet;

  // Bot decision making
  if (randomAction < 0.1) {
    // 10% chance to fold
    handleFold();
  } else if (randomAction < 0.3) {
    // 20% chance to raise
    const raiseAmount = callAmount + minBet;
    handleBet(raiseAmount);
  } else {
    // 70% chance to call
    handleBet(callAmount);
  }
};