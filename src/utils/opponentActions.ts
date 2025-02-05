
import { GameContext, Player } from '@/types/poker';

export const handleOpponentAction = (
  player: Player,
  gameContext: GameContext,
  handleBet: (amount: number) => void,
  handleFold: () => void
) => {
  console.log('Bot action for:', player.name, 'Current bet:', gameContext.currentBet, 'Player bet:', player.currentBet);
  
  // Calculate the amount needed to call
  const amountToCall = gameContext.currentBet - player.currentBet;
  
  // Determine stage of the game
  const gameStage = gameContext.communityCards.length === 0 ? 'preflop' :
                    gameContext.communityCards.length === 3 ? 'flop' :
                    gameContext.communityCards.length === 4 ? 'turn' : 'river';
  
  // Evaluate hand strength
  const hasPair = player.cards[0].rank === player.cards[1].rank;
  const hasHighCards = player.cards.some(card => ['A', 'K', 'Q', 'J'].includes(card.rank));
  const isSuitedConnectors = player.cards[0].suit === player.cards[1].suit;
  
  // Betting probabilities based on game stage and hand strength
  let bettingProbability = 0.5; // Base probability
  
  if (gameStage === 'preflop') {
    if (hasPair) bettingProbability += 0.3;
    if (hasHighCards) bettingProbability += 0.2;
    if (isSuitedConnectors) bettingProbability += 0.1;
  } else {
    // Post-flop strategy
    const hasGoodCommunityCards = gameContext.communityCards.some(card => 
      ['A', 'K', 'Q', 'J', '10'].includes(card.rank)
    );
    if (hasGoodCommunityCards) bettingProbability += 0.2;
  }
  
  // Position based strategy
  const isLatePosition = gameContext.currentPlayer > (gameContext.players.length / 2);
  if (isLatePosition) bettingProbability += 0.1;
  
  // Decision making
  const shouldContinue = Math.random() < bettingProbability;
  
  if (shouldContinue && player.chips >= amountToCall) {
    // Determine whether to raise
    const shouldRaise = Math.random() < 0.4 && player.chips >= (amountToCall * 2);
    
    if (shouldRaise) {
      const raiseAmount = Math.min(
        amountToCall + Math.floor(Math.random() * 3 + 1) * gameContext.minimumBet,
        player.chips
      );
      console.log(`${player.name} raising to ${raiseAmount}`);
      handleBet(raiseAmount);
    } else {
      console.log(`${player.name} calling ${amountToCall}`);
      handleBet(amountToCall);
    }
  } else {
    console.log(`${player.name} folding`);
    handleFold();
  }
};
