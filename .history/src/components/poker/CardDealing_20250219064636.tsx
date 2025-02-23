import { Card, Suit, Rank } from '@/types/poker';

export const useCardDealing = () => {
  const dealCommunityCards = (count: number): Card[] => {
    const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
    const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    
    const newCards: Card[] = Array(count).fill(null).map(() => ({
      suit: suits[Math.floor(Math.random() * suits.length)],
      rank: ranks[Math.floor(Math.random() * ranks.length)],
      faceUp: true
    }));

    return newCards;
  };

  return {
    dealCommunityCards,
  };
};