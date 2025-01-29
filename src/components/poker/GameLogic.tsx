import { GameContext, Player } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';
import { dealCards } from '@/utils/pokerLogic';

export const useGameLogic = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
) => {
  const startNewHand = () => {
    // Find the current dealer or set it to the first player if no dealer
    const currentDealerIndex = gameContext.dealerPosition;
    const nextDealerIndex = (currentDealerIndex + 1) % gameContext.players.length;
    
    // Deal cards and set the first player after the dealer to start
    const { updatedPlayers, remainingDeck } = dealCards(gameContext.players);
    const firstPlayerIndex = (nextDealerIndex + 1) % gameContext.players.length;
    
    setGameContext(prev => ({
      ...prev,
      players: updatedPlayers.map((p, i) => ({ 
        ...p,
        isTurn: i === firstPlayerIndex,
        isActive: true,
        currentBet: 0
      })),
      gameState: "betting",
      currentPlayer: firstPlayerIndex,
      communityCards: [],
      pot: 0,
      rake: 0,
      currentBet: prev.minimumBet,
      dealerPosition: nextDealerIndex
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