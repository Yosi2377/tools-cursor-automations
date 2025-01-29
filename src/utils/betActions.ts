import { GameContext, Player } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';
import { calculateRake } from './rakeCalculator';

export const placeBet = (
  gameContext: GameContext,
  currentPlayer: Player,
  amount: number,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
) => {
  if (currentPlayer.chips < amount) {
    toast({
      title: "Invalid bet",
      description: "You don't have enough chips",
      variant: "destructive",
    });
    return null;
  }

  const rake = calculateRake(amount);
  const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;

  const updatedContext = {
    ...gameContext,
    players: gameContext.players.map(p => 
      p.id === currentPlayer.id
        ? { ...p, chips: p.chips - amount, currentBet: p.currentBet + amount }
        : p
    ),
    pot: gameContext.pot + amount - rake,
    rake: (gameContext.rake || 0) + rake,
    currentBet: Math.max(gameContext.currentBet, amount),
    currentPlayer: nextPlayerIndex,
  };

  toast({
    title: "Bet placed",
    description: `${currentPlayer.name} bet ${amount} chips (Rake: ${rake} chips)`,
  });

  return updatedContext;
};