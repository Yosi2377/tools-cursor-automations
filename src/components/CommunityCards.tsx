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
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-16 flex gap-4 z-30">
      {cards.map((card, index) => (
        <div
          key={index}
          className="w-32 h-44 bg-white rounded-xl shadow-2xl flex flex-col items-center justify-between p-4 transform hover:scale-105 transition-transform border-2 border-poker-accent"
          style={{ 
            animation: `dealCommunityCard 0.5s ease-out ${index * 0.15}s both`,
            backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
            boxShadow: '0 12px 24px -8px rgba(0,0,0,0.3), 0 8px 16px -4px rgba(0,0,0,0.2)'
          }}
        >
          <div className={`text-3xl font-bold ${getSuitColor(card.suit)} self-start`}>
            {card.rank}
          </div>
          <div className={`text-6xl ${getSuitColor(card.suit)}`}>
            {getSuitSymbol(card.suit)}
          </div>
          <div className={`text-3xl font-bold ${getSuitColor(card.suit)} self-end transform rotate-180`}>
            {card.rank}
          </div>
        </div>
      ))}
      <style>
        {`
          @keyframes dealCommunityCard {
            0% {
              opacity: 0;
              transform: translate(-100px, -100px) rotate(-30deg);
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