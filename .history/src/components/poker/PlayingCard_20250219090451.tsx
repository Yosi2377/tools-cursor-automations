import React from 'react';
import { cn } from '@/lib/utils';

interface PlayingCardProps {
  suit: string;
  rank: string;
  isHidden?: boolean;
  className?: string;
}

const PlayingCard: React.FC<PlayingCardProps> = ({ suit, rank, isHidden = false, className }) => {
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

  if (isHidden) {
    return (
      <div 
        className={cn(
          "relative rounded-xl overflow-hidden",
          "bg-gradient-to-br from-blue-600 to-blue-800",
          "border-2 border-white/10",
          className
        )}
      >
        {/* Card back pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-2 border-2 border-white/30 rounded-lg" />
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(255,255,255,0.1) 10px,
                rgba(255,255,255,0.1) 20px
              )`
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative bg-white rounded-xl p-2",
        "flex flex-col items-center justify-between",
        "shadow-lg hover:shadow-xl transition-shadow duration-200",
        className
      )}
      style={{
        backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%)'
      }}
    >
      {/* Top rank and suit */}
      <div className={`text-lg font-bold ${getSuitColor(suit)} self-start`}>
        {rank}
        <span className="ml-1 text-sm">{getSuitSymbol(suit)}</span>
      </div>

      {/* Center suit */}
      <div className={`text-4xl ${getSuitColor(suit)} transform`}>
        {getSuitSymbol(suit)}
      </div>

      {/* Bottom rank and suit (rotated) */}
      <div 
        className={`text-lg font-bold ${getSuitColor(suit)} self-end transform rotate-180`}
      >
        {rank}
        <span className="ml-1 text-sm">{getSuitSymbol(suit)}</span>
      </div>

      {/* Card shine effect */}
      <div 
        className="absolute inset-0 rounded-xl opacity-30"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)'
        }}
      />
    </div>
  );
};

export default PlayingCard; 