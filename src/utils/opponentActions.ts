import { GameContext, Player } from '@/types/poker';

export const handleOpponentAction = (
  player: Player,
  gameContext: GameContext,
  handleBet: (amount: number) => void,
  handleFold: () => void
) => {
  console.log('Opponent action for:', player.name, 'Current bet:', gameContext.currentBet, 'Player bet:', player.currentBet);
  
  const amountToCall = gameContext.currentBet - player.currentBet;
  const isFirstRound = gameContext.communityCards.length === 0;
  const hasGoodCards = player.cards.some(card => ['A', 'K', 'Q', 'J', '10'].includes(card.rank));
  const hasPair = player.cards[0].rank === player.cards[1].rank;
  const hasHighCards = player.cards.every(card => ['A', 'K', 'Q', 'J', '10'].includes(card.rank));
  
  // More aggressive betting strategy
  const shouldBet = isFirstRound || hasGoodCards || hasPair || hasHighCards || Math.random() < 0.7;
  
  // Random delay between 500ms and 2000ms to simulate thinking
  const delay = Math.random() * 1500 + 500;
  
  setTimeout(() => {
    if (shouldBet && player.chips >= amountToCall) {
      // Increased probability of raising
      const shouldRaise = Math.random() < 0.4;
      const raiseAmount = shouldRaise 
        ? amountToCall + Math.floor(Math.random() * 3 + 1) * gameContext.minimumBet 
        : amountToCall;
      
      if (player.chips >= raiseAmount) {
        console.log(`${player.name} betting ${raiseAmount}`);
        handleBet(raiseAmount);
      } else {
        console.log(`${player.name} calling ${amountToCall}`);
        handleBet(amountToCall);
      }
    } else {
      console.log(`${player.name} folding`);
      handleFold();
    }
  }, delay);
};