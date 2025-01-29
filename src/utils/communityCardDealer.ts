import { GameContext, Card } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';

export const dealCommunityCardsForStage = (
  prevContext: GameContext,
  dealFunction: (count: number) => Card[]
): { newCards: Card[], updatedContext: Partial<GameContext> } => {
  let newCards: Card[] = [];
  
  if (prevContext.communityCards.length === 0) {
    newCards = dealFunction(3); // Deal flop
    toast({
      title: "Flop dealt!",
      description: "Three community cards are now on the table",
    });
  } else if (prevContext.communityCards.length === 3) {
    newCards = dealFunction(1); // Deal turn
    toast({
      title: "Turn dealt!",
      description: "Fourth community card is now on the table",
    });
  } else if (prevContext.communityCards.length === 4) {
    newCards = dealFunction(1); // Deal river
    toast({
      title: "River dealt!",
      description: "Final community card is now on the table",
    });
  }

  return {
    newCards,
    updatedContext: {
      communityCards: [...prevContext.communityCards, ...newCards],
      players: prevContext.players.map(p => ({ ...p, currentBet: 0 })),
      currentBet: prevContext.minimumBet
    }
  };
};