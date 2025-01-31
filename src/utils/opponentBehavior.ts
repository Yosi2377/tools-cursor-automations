import { GameContext } from '@/types/poker';

export const simulateOpponentAction = (
  gameContext: GameContext,
  nextPlayer: any,
  handleBet: (amount: number) => void,
  handlePlayerFold: () => void
) => {
  console.log('Simulating opponent action for:', nextPlayer.name);
  
  // Calculate the amount needed to call
  const amountToCall = gameContext.currentBet - nextPlayer.currentBet;
  
  // Bot decision making
  const isFirstRound = gameContext.communityCards.length === 0;
  const hasGoodCards = nextPlayer.cards.some(card => ['A', 'K', 'Q', 'J'].includes(card.rank));
  const hasPair = nextPlayer.cards[0].rank === nextPlayer.cards[1].rank;
  
  // More aggressive betting in early rounds or with good cards
  const shouldBet = isFirstRound || hasGoodCards || hasPair || Math.random() < 0.6;
  
  // Add randomized delay to make it feel more natural
  const delay = Math.random() * 1000 + 500; // 500-1500ms delay
  
  setTimeout(() => {
    if (shouldBet && nextPlayer.chips >= amountToCall) {
      console.log(`Bot ${nextPlayer.name} betting ${amountToCall}`);
      handleBet(amountToCall);
    } else {
      console.log(`Bot ${nextPlayer.name} folding`);
      handlePlayerFold();
    }
  }, delay);
};