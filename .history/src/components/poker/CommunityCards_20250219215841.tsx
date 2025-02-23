import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/types/poker';
import PlayingCard from './PlayingCard';

interface CommunityCardsProps {
  cards: Card[];
}

const CommunityCards: React.FC<CommunityCardsProps> = ({ cards }) => {
  return (
    <div className="relative flex items-center justify-center gap-3">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-radial from-white/5 to-transparent blur-xl" />
      
      <AnimatePresence>
        {cards.map((card, index) => (
          <motion.div
            key={`${card.suit}-${card.rank}`}
            initial={{ 
              scale: 0,
              opacity: 0,
              y: -150,
              rotateY: 180,
              x: (index - 2) * 100 // Increased spread
            }}
            animate={{ 
              scale: 1,
              opacity: 1,
              y: 0,
              rotateY: 0,
              x: (index - 2) * 100
            }}
            exit={{ 
              scale: 0,
              opacity: 0,
              y: 150,
              rotateY: -180
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              delay: index * 0.15,
              mass: 1.2
            }}
            style={{
              perspective: 1200,
              transformStyle: "preserve-3d"
            }}
            className="relative"
          >
            {/* Enhanced card shadow */}
            <div 
              className="absolute -inset-3 bg-black/30 blur-xl rounded-2xl"
              style={{
                transform: 'translateZ(-20px) scale(0.9)',
                filter: 'blur(8px)'
              }}
            />
            
            {/* Card container with 3D effects */}
            <motion.div
              whileHover={{
                scale: 1.08,
                y: -8,
                rotateY: 10,
                transition: { 
                  duration: 0.2,
                  ease: "easeOut"
                }
              }}
              className="relative transform-gpu"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Main card */}
              <PlayingCard
                suit={card.suit}
                rank={card.rank}
                isHidden={card.isHidden}
                className="card w-18 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 rounded-xl shadow-2xl"
              />
              
              {/* Enhanced hover glow effect */}
              <motion.div
                className="absolute inset-0 rounded-xl opacity-0 mix-blend-soft-light pointer-events-none"
                whileHover={{ opacity: 0.7 }}
                style={{
                  background: `
                    radial-gradient(
                      circle at 50% 0%,
                      rgba(255,255,255,0.8) 0%,
                      rgba(255,255,255,0.5) 25%,
                      rgba(255,255,255,0) 70%
                    ),
                    linear-gradient(
                      to bottom,
                      rgba(255,255,255,0.3) 0%,
                      rgba(255,255,255,0) 100%
                    )
                  `
                }}
              />
              
              {/* Reflection effect */}
              <div 
                className="absolute inset-0 rounded-xl opacity-20"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)',
                  transform: 'translateZ(1px)'
                }}
              />
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Enhanced card slots */}
      {Array.from({ length: 5 - cards.length }).map((_, index) => (
        <motion.div
          key={`slot-${index}`}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.2, 0.3, 0.2],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
            delay: index * 0.3
          }}
          className="w-18 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 rounded-xl border-2 border-dashed border-white/30
            bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm"
          style={{
            transform: `translateX(${(index + cards.length - 2) * 100}px)`
          }}
        >
          {/* Slot inner glow */}
          <div className="w-full h-full rounded-xl bg-gradient-radial from-white/10 to-transparent opacity-50" />
        </motion.div>
      ))}
    </div>
  );
};

export default CommunityCards;