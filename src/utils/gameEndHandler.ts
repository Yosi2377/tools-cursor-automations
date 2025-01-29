import { GameContext, Player } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';

export const handleGameEnd = (
  winner: Player,
  pot: number,
  rake: number,
  players: Player[],
  dealerPosition: number
): GameContext => {
  toast({
    title: "Game Over",
    description: `${winner.name} wins ${pot} chips! (Total rake: ${rake} chips)`,
  });
  
  return {
    gameState: "waiting",
    players: players.map(p => ({
      ...p,
      chips: p.id === winner.id ? p.chips + pot : p.chips,
      cards: [],
      currentBet: 0,
      isActive: true,
      isTurn: false,
    })),
    pot: 0,
    rake: 0,
    communityCards: [],
    currentBet: 0,
    dealerPosition: (dealerPosition + 1) % players.length,
    currentPlayer: 0,
    minimumBet: 20
  };
};