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
      className={`w-20 h-28 rounded-lg shadow-xl flex flex-col items-center justify-between p-2 transform transition-all duration-300 ${
        shouldShowFaceUp
          ? 'bg-white border-2 border-poker-accent hover:scale-110'
          : 'bg-poker-accent/80 border-2 border-poker-accent hover:bg-poker-accent/90'
      }`}
      style={{
        animation: `dealCard ${0.3 + index * 0.1}s ease-out forwards`,
        boxShadow: '0 8px 16px -4px rgba(0,0,0,0.2), 0 4px 8px -2px rgba(0,0,0,0.1)'
      }}
    >
      {shouldShowFaceUp ? (
        <>
          <div className={`text-xl font-bold ${getSuitColor(card.suit)} self-start`}>
            {card.rank}
          </div>
          <div className={`text-3xl ${getSuitColor(card.suit)}`}>
            {getSuitSymbol(card.suit)}
          </div>
          <div className={`text-xl font-bold ${getSuitColor(card.suit)} self-end transform rotate-180`}>
            {card.rank}
          </div>
        </>
      ) : (
        <div className="w-full h-full rounded-md bg-gradient-to-br from-poker-accent/40 to-poker-accent/20 border border-poker-accent/30 flex items-center justify-center">
          <div className="text-white/80 text-2xl font-bold">♠</div>
        </div>
      )}
    </div>
  );
};

export default PlayerCard;