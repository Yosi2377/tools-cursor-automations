import { GameContext, Player } from '@/types/poker';
import { toast } from 'sonner';

export const handleOpponentAction = async (
  player: Player,
  gameContext: GameContext,
  handleBet: (amount: number) => Promise<void>,
  handleFold: () => Promise<void>
) => {
  try {
    console.log('Bot action for:', player.name, 'Current bet:', gameContext.currentBet, 'Player bet:', player.currentBet);
    
    // Validate game state
    if (!player || !gameContext) {
      console.error('Invalid game state or player');
      return;
    }

    // Add small random delay to make bot actions feel more natural
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Calculate the amount needed to call
    const amountToCall = player.currentBet === 0 ? 
      gameContext.minimumBet : 
      gameContext.currentBet - player.currentBet;
    
    console.log('Bot action for:', player.name, 
      'Current bet:', gameContext.currentBet, 
      'Player bet:', player.currentBet,
      'Amount to call:', amountToCall,
      'Minimum bet:', gameContext.minimumBet);
    
    // Determine stage of the game
    const gameStage = gameContext.communityCards.length === 0 ? 'preflop' :
                      gameContext.communityCards.length === 3 ? 'flop' :
                      gameContext.communityCards.length === 4 ? 'turn' : 'river';
    
    // Enhanced hand strength evaluation
    const hasPair = player.cards[0].rank === player.cards[1].rank;
    const hasHighCards = player.cards.some(card => ['A', 'K', 'Q', 'J'].includes(card.rank));
    const isSuitedConnectors = player.cards[0].suit === player.cards[1].suit &&
      Math.abs(parseInt(player.cards[0].rank) - parseInt(player.cards[1].rank)) === 1;
    
    // Dynamic betting probabilities based on game stage
    let bettingProbability = 0.7; // Higher base probability for more active play
    
    // Adjust probability based on game stage and hand strength
    if (gameStage === 'preflop') {
      if (hasPair) bettingProbability += 0.3;
      if (hasHighCards) bettingProbability += 0.2;
      if (isSuitedConnectors) bettingProbability += 0.15;
    } else {
      // Enhanced post-flop strategy
      const hasGoodCommunityCards = gameContext.communityCards.some(card => 
        ['A', 'K', 'Q', 'J', '10'].includes(card.rank)
      );
      
      const hasPairWithBoard = player.cards.some(card =>
        gameContext.communityCards.some(communityCard => card.rank === communityCard.rank)
      );
      
      // Count matching suits for flush potential
      const suitCount = gameContext.communityCards.filter(card => 
        card.suit === player.cards[0].suit || card.suit === player.cards[1].suit
      ).length;
      
      if (hasGoodCommunityCards) bettingProbability += 0.2;
      if (hasPairWithBoard) bettingProbability += 0.3;
      if (suitCount >= 3) bettingProbability += 0.25;
    }
    
    // Enhanced position based strategy
    const isLatePosition = gameContext.currentPlayer > (gameContext.players.length / 2);
    const isButton = gameContext.currentPlayer === (gameContext.dealerPosition + 1) % gameContext.players.length;
    if (isLatePosition) bettingProbability += 0.15;
    if (isButton) bettingProbability += 0.1;
    
    // Improved pot odds consideration
    const potOdds = amountToCall / (gameContext.pot + amountToCall);
    if (potOdds < 0.3) bettingProbability += 0.15;
    if (gameContext.pot > gameContext.minimumBet * 10) bettingProbability += 0.1;
    
    // Stack size consideration
    const stackToPotRatio = player.chips / gameContext.pot;
    if (stackToPotRatio > 3) bettingProbability += 0.1;
    
    // Decision making with error handling
    const shouldContinue = Math.random() < bettingProbability;
    
    if (shouldContinue && player.chips >= amountToCall) {
      try {
        // Enhanced raising logic
        const shouldRaise = Math.random() < 0.45 && player.chips >= (amountToCall * 2);
        
        if (shouldRaise) {
          const minRaise = amountToCall + gameContext.minimumBet;
          const maxRaise = Math.min(
            amountToCall + Math.floor(Math.random() * 3 + 1) * gameContext.minimumBet,
            Math.min(player.chips, gameContext.pot * 0.75) // More conservative raising
          );
          const raiseAmount = Math.max(minRaise, maxRaise);
          
          console.log(`${player.name} raising to ${raiseAmount}`);
          await handleBet(raiseAmount);
        } else {
          console.log(`${player.name} calling ${amountToCall}`);
          await handleBet(amountToCall);
        }
      } catch (error) {
        console.error('Error during bot betting action:', error);
        // Fallback to folding on error
        await handleFold();
      }
    } else {
      console.log(`${player.name} folding`);
      await handleFold();
    }
  } catch (error) {
    console.error('Error in bot action:', error);
    toast.error(`${player.name} encountered an error. Folding.`);
    await handleFold();
  }
};
