import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/types/poker';
import PlayingCard from './PlayingCard';

interface CommunityCardsProps {
  cards: Card[];
}

const CommunityCards: React.FC<CommunityCardsProps> = ({ cards }) => {
  return (
    <div className="relative flex items-center justify-center gap-2">
      <AnimatePresence>
        {cards.map((card, index) => (
          <motion.div
            key={`${card.suit}-${card.rank}`}
            initial={{ 
              scale: 0,
              opacity: 0,
              y: -100,
              rotateY: 180,
              x: (index - 2) * 80 // Spread from center
            }}
            animate={{ 
              scale: 1,
              opacity: 1,
              y: 0,
              rotateY: 0,
              x: (index - 2) * 80
            }}
            exit={{ 
              scale: 0,
              opacity: 0,
              y: 100,
              rotateY: -180
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: index * 0.2
            }}
            style={{
              perspective: 1000
            }}
            className="relative"
          >
            {/* Card shadow */}
            <div 
              className="absolute -inset-2 bg-black/20 blur-lg rounded-xl"
              style={{
                transform: 'translateZ(-10px)'
              }}
            />
            
            {/* Card glow on hover */}
            <motion.div
              whileHover={{
                scale: 1.05,
                y: -5,
                transition: { duration: 0.2 }
              }}
              className="relative"
            >
              <PlayingCard
                suit={card.suit}
                rank={card.rank}
                isHidden={card.isHidden}
                className="w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-32"
              />
              
              {/* Hover glow effect */}
              <motion.div
                className="absolute inset-0 rounded-xl opacity-0 transition-opacity"
                whileHover={{ opacity: 0.4 }}
                style={{
                  background: `radial-gradient(
                    circle at center,
                    rgba(255,255,255,0.8) 0%,
                    rgba(255,255,255,0) 70%
                  )`
                }}
              />
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Card slots */}
      {Array.from({ length: 5 - cards.length }).map((_, index) => (
        <motion.div
          key={`slot-${index}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          className="w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-32 rounded-xl border-2 border-dashed border-white/20"
          style={{
            transform: `translateX(${(index + cards.length - 2) * 80}px)`
          }}
        />
      ))}
    </div>
  );
};

export default CommunityCards;