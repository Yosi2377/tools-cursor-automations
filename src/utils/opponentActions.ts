import { GameContext, Player } from '@/types/poker';

export const handleOpponentAction = (
  player: Player,
  gameContext: GameContext,
  handleBet: (amount: number) => void,
  handleFold: () => void
) => {
  console.log('Bot action for:', player.name, 'Current bet:', gameContext.currentBet, 'Player bet:', player.currentBet);
  
  const amountToCall = gameContext.currentBet - player.currentBet;
  const isFirstRound = gameContext.communityCards.length === 0;
  const hasGoodCards = player.cards.some(card => ['A', 'K', 'Q', 'J', '10'].includes(card.rank));
  const hasPair = player.cards[0].rank === player.cards[1].rank;
  const hasHighCards = player.cards.every(card => ['A', 'K', 'Q', 'J', '10'].includes(card.rank));
  
  // More aggressive betting strategy with higher probability
  const shouldBet = isFirstRound || hasGoodCards || hasPair || hasHighCards || Math.random() < 0.8;
  
  // Shorter delay between 200ms and 700ms to simulate faster thinking
  const delay = Math.random() * 500 + 200;
  
  setTimeout(() => {
    if (shouldBet && player.chips >= amountToCall) {
      // Increased probability of raising to 60%
      const shouldRaise = Math.random() < 0.6;
      const raiseAmount = shouldRaise 
        ? amountToCall + Math.floor(Math.random() * 4 + 1) * gameContext.minimumBet 
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