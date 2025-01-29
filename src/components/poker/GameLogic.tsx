import { GameContext, Player } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';
import { dealCards } from '@/utils/pokerLogic';

export const useGameLogic = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
) => {
  const startNewHand = () => {
    const { updatedPlayers, remainingDeck } = dealCards(gameContext.players);
    setGameContext(prev => ({
      ...prev,
      players: updatedPlayers.map((p, i) => ({ ...p, isTurn: i === 0 })),
      gameState: "betting",
      currentPlayer: 0,
      communityCards: [],
      pot: 0,
      currentBet: prev.minimumBet
    }));
    toast({
      title: "New hand started",
      description: "Cards have been dealt to all players",
    });
  };

  const handleWinner = (winner: Player, updatedContext: GameContext) => {
    toast({
      title: "Game Over",
      description: `${winner.name} wins ${updatedContext.pot} chips!`,
    });
    
    return {
      ...updatedContext,
      gameState: "waiting",
      players: updatedContext.players.map(p => ({
        ...p,
        chips: p.id === winner.id ? p.chips + updatedContext.pot : p.chips,
        cards: [],
        currentBet: 0,
        isActive: true,
        isTurn: false
      })),
      pot: 0,
      communityCards: [],
      currentBet: 0
    };
  };

  return {
    startNewHand,
    handleWinner,
  };
};