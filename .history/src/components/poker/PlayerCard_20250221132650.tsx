import React from 'react';
import { Card } from '@/types/poker';
import { motion } from 'framer-motion';

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
    return ['hearts', 'diamonds'].includes(suit.toLowerCase()) 
      ? 'text-red-600 drop-shadow-[0_0_3px_rgba(220,38,38,0.3)]' 
      : 'text-gray-900 drop-shadow-[0_0_3px_rgba(0,0,0,0.2)]';
  };

  return (
    <motion.div
      initial={{ scale: 0, rotateY: 180 }}
      animate={{ scale: 1, rotateY: 0 }}
      transition={{ 
        duration: 0.5,
        delay: index * 0.2,
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      className="perspective-1000"
    >
      <div
        className={`
          card
          w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 
          rounded-xl shadow-xl 
          flex flex-col items-center justify-between p-2
          transition-all duration-300
          hover:shadow-2xl hover:-translate-y-1
          ${shouldShowFaceUp ? 'bg-white' : 'bg-gradient-to-br from-indigo-600 to-indigo-800'}
        `}
        style={{
          backgroundImage: shouldShowFaceUp 
            ? 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)' 
            : 'none',
          boxShadow: shouldShowFaceUp 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 2px 4px rgba(255, 255, 255, 0.3)' 
            : '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        {shouldShowFaceUp ? (
          <>
            <div 
              className={`
                text-sm sm:text-base md:text-lg 
                font-bold ${getSuitColor(card.suit)} 
                self-start leading-none
                tracking-tighter
              `}
              style={{ 
                fontSize: card.rank.length > 1 ? '0.85em' : '1em',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
            >
              {card.rank}
            </div>
            <div 
              className={`
                text-xl sm:text-2xl md:text-3xl 
                ${getSuitColor(card.suit)}
                transform hover:scale-110 transition-transform duration-200
              `}
            >
              {getSuitSymbol(card.suit)}
            </div>
            <div 
              className={`
                text-sm sm:text-base md:text-lg 
                font-bold ${getSuitColor(card.suit)} 
                self-end transform rotate-180 leading-none
                tracking-tighter
              `}
              style={{ 
                fontSize: card.rank.length > 1 ? '0.85em' : '1em',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
            >
              {card.rank}
            </div>
          </>
        ) : (
          <div className="w-full h-full rounded-lg bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 border border-white/10">
            <div className="w-full h-full rounded-lg bg-[url('/card-pattern.png')] opacity-30 mix-blend-overlay" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PlayerCard;