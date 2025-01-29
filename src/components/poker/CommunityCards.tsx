import React from 'react';
import { Card } from '@/types/poker';

interface CommunityCardsProps {
  cards: Card[];
}

const CommunityCards: React.FC<CommunityCardsProps> = ({ cards }) => {
  const suitColors = {
    hearts: "text-red-500",
    diamonds: "text-red-500",
    clubs: "text-gray-900",
    spades: "text-gray-900"
  };

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-16 flex gap-3">
      {cards.map((card, index) => (
        <div
          key={index}
          className="w-16 h-24 bg-white rounded-lg shadow-xl animate-card-deal flex flex-col items-center justify-center transform hover:scale-105 transition-transform"
          style={{ 
            animationDelay: `${index * 0.1}s`,
            backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
          }}
        >
          <span className={`text-lg font-bold ${suitColors[card.suit]}`}>
            {card.rank}
          </span>
          <span className={`text-2xl ${suitColors[card.suit]}`}>
            {card.suit === "hearts" ? "♥" :
             card.suit === "diamonds" ? "♦" :
             card.suit === "clubs" ? "♣" : "♠"}
          </span>
        </div>
      ))}
    </div>
  );
};

export default CommunityCards;