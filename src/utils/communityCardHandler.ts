import { GameContext, Card } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';
import { dealCommunityCardsForStage } from './communityCardDealer';

export const checkAndDealCommunityCards = (
  updatedContext: GameContext,
  dealCommunityCards: (count: number) => Card[],
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
): boolean => {
  const activePlayers = updatedContext.players.filter(p => p.isActive);
  const allPlayersActed = activePlayers.every(p => 
    !p.isActive || p.currentBet === updatedContext.currentBet
  );

  if (allPlayersActed && activePlayers.length > 1) {
    toast({
      title: "Dealing cards...",
      description: "Get ready for the next round!",
    });

    setTimeout(() => {
      setGameContext(prev => {
        const { newCards, updatedContext } = dealCommunityCardsForStage(prev, dealCommunityCards);
        return {
          ...prev,
          ...updatedContext,
          players: prev.players.map(p => ({
            ...p,
            currentBet: 0
          })),
          currentBet: prev.minimumBet
        };
      });
    }, 500);
    return true;
  }
  return false;
};