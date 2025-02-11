import React from 'react';
import { Card } from '@/types/poker';

interface PlayerCardProps {
  card: Card;
  index: number;
  shouldShowFaceUp: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ card, index, shouldShowFaceUp }) => {
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
    <div
      className={`w-8 h-12 rounded-md shadow-lg flex flex-col items-center justify-between p-1 animate-card-deal ${
        shouldShowFaceUp
          ? 'bg-white'
          : 'bg-poker-accent/20 border border-poker-accent/40'
      }`}
      style={{
        animationDelay: `${index * 0.2}s`,
        backgroundImage: shouldShowFaceUp ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)' : 'none'
      }}
    >
      {shouldShowFaceUp ? (
        <>
          <div className={`text-sm font-bold ${getSuitColor(card.suit)} self-start`}>
            {card.rank}
          </div>
          <div className={`text-lg ${getSuitColor(card.suit)}`}>
            {getSuitSymbol(card.suit)}
          </div>
          <div className={`text-sm font-bold ${getSuitColor(card.suit)} self-end transform rotate-180`}>
            {card.rank}
          </div>
        </>
      ) : (
        <div className="w-full h-full rounded-md bg-gradient-to-br from-poker-accent/30 to-poker-accent/10" />
      )}
    </div>
  );
};

export default PlayerCard;
