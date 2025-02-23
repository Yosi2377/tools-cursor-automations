import React from 'react';
import { Suit, Rank } from '@/types/poker';

interface CardProps {
  suit: Suit;
  rank: Rank;
  faceDown?: boolean;
}

const Card: React.FC<CardProps> = ({ suit, rank, faceDown = false }) => {
  const getSuitColor = () => {
    switch (suit) {
      case 'hearts':
      case 'diamonds':
        return 'text-red-500';
      case 'spades':
      case 'clubs':
        return 'text-black';
      default:
        return '';
    }
  };

  const getSuitSymbol = () => {
    switch (suit) {
      case 'hearts':
        return '♥';
      case 'diamonds':
        return '♦';
      case 'spades':
        return '♠';
      case 'clubs':
        return '♣';
      default:
        return '';
    }
  };

  if (faceDown) {
    return (
      <div className="w-16 h-24 bg-blue-800 rounded-lg border-2 border-white shadow-lg"></div>
    );
  }

  return (
    <div className="w-16 h-24 bg-white rounded-lg border border-gray-300 shadow-lg flex flex-col items-center justify-between p-2">
      <div className={`text-lg font-bold ${getSuitColor()}`}>
        {rank}
      </div>
      <div className={`text-3xl ${getSuitColor()}`}>
        {getSuitSymbol()}
      </div>
      <div className={`text-lg font-bold ${getSuitColor()} transform rotate-180`}>
        {rank}
      </div>
    </div>
  );
};

export default Card; 