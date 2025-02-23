import React from 'react';
import { Card } from '@/types/poker';
import PlayingCard from './PlayingCard';

interface PlayerCardsProps {
  cards: Card[];
  faceUp: boolean;
}

const getCardPosition = (position: string) => {
  switch (position) {
    case 'bottom':
      return 'top-full mt-10'
    case 'bottomRight':
      return '-top-1/2 -translate-y-full -mt-8'
    case 'right':
      return '-left-full -translate-x-full -mt-8'
    case 'topRight':
      return 'bottom-full translate-y-1/2 -mb-8'
    case 'top':
      return 'bottom-full -mb-10'
    case 'topLeft':
      return 'bottom-full translate-y-1/2 -mb-8'
    case 'left':
      return '-right-full translate-x-full -mt-8'
    case 'bottomLeft':
      return '-top-1/2 -translate-y-full -mt-8'
    default:
      return 'top-0 -translate-y-full'
  }
}

const PlayerCards: React.FC<PlayerCardsProps> = ({ cards, faceUp }) => {
  return (
    <div className="relative flex gap-1">
      {cards.map((card, index) => (
        <PlayingCard
          key={`${card.suit}-${card.rank}-${index}`}
          suit={card.suit}
          rank={card.rank}
          isHidden={!faceUp}
        />
      ))}
    </div>
  );
};

export default PlayerCards; 