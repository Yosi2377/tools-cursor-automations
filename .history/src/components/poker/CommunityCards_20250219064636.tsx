import React from 'react';
import { Card } from '@/types/poker';

interface CommunityCardsProps {
  cards: Card[];
}

const CommunityCards: React.FC<CommunityCardsProps> = ({ cards }) => {
  const getSuitSymbol = (suit: string) => {
    switch (suit.toLowerCase()) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  const getSuitColor = (suit: string) => {
    return ['hearts', 'diamonds'].includes(suit.toLowerCase()) ? 'text-red-500' : 'text-gray-900';
  };

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-16 flex gap-3">
      {cards.map((card, index) => (
        <div
          key={index}
          className="w-16 h-24 bg-white rounded-lg shadow-xl flex flex-col items-center justify-between p-2 transform hover:scale-105 transition-transform"
          style={{ 
            animation: `dealCard 0.5s ease-out ${index * 0.15}s both`,
            backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
          }}
        >
          <div className={`text-lg font-bold ${getSuitColor(card.suit)} self-start`}>
            {card.rank}
          </div>
          <div className={`text-3xl ${getSuitColor(card.suit)}`}>
            {getSuitSymbol(card.suit)}
          </div>
          <div className={`text-lg font-bold ${getSuitColor(card.suit)} self-end transform rotate-180`}>
            {card.rank}
          </div>
        </div>
      ))}
      <style>
        {`
          @keyframes dealCard {
            0% {
              opacity: 0;
              transform: translate(-50px, -100px) rotate(-20deg);
            }
            100% {
              opacity: 1;
              transform: translate(0, 0) rotate(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default CommunityCards;