import { GameContext, Card } from '@/types/poker';
import { toast } from 'sonner';

export const checkAndDealCommunityCards = (
  gameContext: GameContext,
  dealCommunityCards: (count: number) => Card[],
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
): boolean => {
  const activePlayers = gameContext.players.filter(p => p.isActive);
  
  // Check if all active players have matched the current bet
  const allPlayersActed = activePlayers.every(p => p.currentBet === gameContext.currentBet);

  console.log('Checking community cards:', {
    activePlayers: activePlayers.length,
    allPlayersActed,
    currentCommunityCards: gameContext.communityCards.length,
    playerBets: activePlayers.map(p => ({ name: p.name, bet: p.currentBet })),
    currentBet: gameContext.currentBet
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
        currentBet: 0,
        currentPlayer: (prev.dealerPosition + 1) % prev.players.length
      }));

      toast(`${stage} dealt!`);
      return true;
    }
  }
  
  return false;
};