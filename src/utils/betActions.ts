import { GameContext, Player } from '@/types/poker';
import { toast } from '@/hooks/use-toast';
import { calculateRake } from './rakeCalculator';

export const placeBet = (
  gameContext: GameContext,
  currentPlayer: Player,
  amount: number,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
) => {
  // Validate bet amount
  if (amount <= 0) {
    console.log('Invalid bet amount:', amount);
    return null;
  }

  if (currentPlayer.chips < amount) {
    toast({
      title: "Invalid bet",
      description: `${currentPlayer.name} doesn't have enough chips`,
    });
    return null;
  }

  const rake = calculateRake(amount);
  const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;

  // Update player chips and current bet
  const updatedContext = {
    ...gameContext,
    players: gameContext.players.map(p => 
      p.id === currentPlayer.id
        ? { 
            ...p, 
            chips: p.chips - amount, 
            currentBet: p.currentBet + amount,
            isTurn: false
          }
        : p
    ),
    pot: gameContext.pot + amount - rake,
    rake: (gameContext.rake || 0) + rake,
    currentBet: Math.max(gameContext.currentBet, currentPlayer.currentBet + amount),
    currentPlayer: nextPlayerIndex,
  };

  toast({
    title: "Bet placed",
    description: `${currentPlayer.name} bet ${amount} chips`,
  });

  return updatedContext;
};