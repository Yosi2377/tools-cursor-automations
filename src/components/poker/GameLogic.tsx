import { GameContext, Player } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';
import { dealCards } from '@/utils/pokerLogic';

export const useGameLogic = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
) => {
  const startNewHand = () => {
    // Find the current dealer or set it to the first player if no dealer
    const currentDealerIndex = gameContext.players.findIndex(p => p.isDealer);
    const nextDealerIndex = currentDealerIndex === -1 ? 0 : (currentDealerIndex + 1) % gameContext.players.length;
    
    // Deal cards and set the first player after the dealer to start
    const { updatedPlayers, remainingDeck } = dealCards(gameContext.players);
    const firstPlayerIndex = (nextDealerIndex + 1) % gameContext.players.length;
    
    setGameContext(prev => ({
      ...prev,
      players: updatedPlayers.map((p, i) => ({ 
        ...p,
        isDealer: i === nextDealerIndex,
        isTurn: i === firstPlayerIndex,
        isActive: true,
        currentBet: 0
      })),
      gameState: "betting",
      currentPlayer: firstPlayerIndex,
      communityCards: [],
      pot: 0,
      rake: 0,
      currentBet: prev.minimumBet
    }));

    toast({
      title: "New hand started",
      description: "Cards have been dealt to all players",
    });
  };

  return {
    startNewHand
  };
};