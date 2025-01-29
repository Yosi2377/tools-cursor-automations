import { GameContext, Card } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';

export const checkAndDealCommunityCards = (
  gameContext: GameContext,
  dealCommunityCards: (count: number) => Card[],
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
): boolean => {
  const activePlayers = gameContext.players.filter(p => p.isActive);
  const allPlayersActed = activePlayers.every(p => 
    p.currentBet === gameContext.currentBet
  );

  console.log('Checking community cards:', {
    activePlayers: activePlayers.length,
    allPlayersActed,
    currentCommunityCards: gameContext.communityCards.length
  });

  if (allPlayersActed && activePlayers.length > 1) {
    let cardsToDeal = 0;
    let stage = '';

    if (gameContext.communityCards.length === 0) {
      cardsToDeal = 3;
      stage = 'Flop';
    } else if (gameContext.communityCards.length === 3) {
      cardsToDeal = 1;
      stage = 'Turn';
    } else if (gameContext.communityCards.length === 4) {
      cardsToDeal = 1;
      stage = 'River';
    }

    if (cardsToDeal > 0) {
      const newCards = dealCommunityCards(cardsToDeal);
      
      setGameContext(prev => ({
        ...prev,
        communityCards: [...prev.communityCards, ...newCards],
        players: prev.players.map(p => ({ ...p, currentBet: 0 })),
        currentBet: prev.minimumBet
      }));

      toast({
        title: `${stage} dealt!`,
        description: `${cardsToDeal} new community card${cardsToDeal > 1 ? 's are' : ' is'} now on the table`,
      });

      return true;
    }
  }
  
  return false;
};