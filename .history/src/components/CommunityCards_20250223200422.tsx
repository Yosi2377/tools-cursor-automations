import React from 'react';
import { Card as CardType } from '@/types/poker';
import Card from './Card';

interface CommunityCardsProps {
  cards: CardType[];
}

const CommunityCards: React.FC<CommunityCardsProps> = ({ cards }) => {
  return (
    <div className="flex gap-2 justify-center items-center">
      {cards.map((card, index) => (
        <Card
          key={index}
          suit={card.suit}
          rank={card.rank}
          faceDown={false}
        />
      ))}
      
      {/* Placeholder cards */}
      {Array.from({ length: Math.max(0, 5 - cards.length) }).map((_, index) => (
        <div
          key={`placeholder-${index}`}
          className="w-16 h-24 border-2 border-dashed border-white/30 rounded-lg"
        />
      ))}
    </div>
  );
};

export default CommunityCards; 