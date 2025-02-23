import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PotDisplayProps {
  pot: number;
  rake?: number;
}

const PotDisplay: React.FC<PotDisplayProps> = ({ pot, rake = 0 }) => {
  return (
    <div className="relative">
      <AnimatePresence>
        {pot > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30
            }}
            className="relative"
          >
            {/* Main pot display with enhanced styling */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className={cn(
                "px-6 py-3 rounded-full",
                "bg-gradient-to-r from-amber-600/90 via-yellow-500/90 to-amber-600/90",
                "backdrop-blur-md shadow-[0_0_15px_rgba(217,119,6,0.3)]",
                "border-2 border-yellow-400/50",
                "flex items-center gap-3"
              )}
              data-testid="pot"
              style={{
                boxShadow: "inset 0 2px 4px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.2)"
              }}
            >
              {/* Enhanced chips stack icon */}
              <div className="relative w-8 h-8">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                    y: [0, -2, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="absolute inset-0"
                >
                  {/* Multiple stacked chips for 3D effect */}
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-full h-full rounded-full"
                      style={{
                        transform: `translateY(${-i * 2}px)`,
                        background: `linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)`,
                        border: "2px solid rgba(251,191,36,0.8)",
                        boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3)",
                        zIndex: 3 - i
                      }}
                    >
                      <div className="absolute inset-1 rounded-full border border-yellow-300/30" />
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Enhanced pot amount display */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1"
              >
                <span className="text-white/80 text-lg font-medium">$</span>
                <motion.span
                  className="text-white font-bold text-xl tracking-wide"
                  style={{
                    textShadow: "0 2px 4px rgba(0,0,0,0.2)"
                  }}
                >
                  {pot.toLocaleString()}
                </motion.span>
              </motion.div>
            </motion.div>

            {/* Enhanced rake display */}
            {rake > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                  px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm
                  border border-white/10 shadow-lg"
              >
                <span className="text-white/70 text-sm font-medium">
                  Rake: <span className="text-yellow-400">${rake.toLocaleString()}</span>
                </span>
              </motion.div>
            )}

            {/* Enhanced glow effects */}
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="absolute -inset-4 rounded-full bg-gradient-radial from-yellow-400/30 to-transparent blur-xl -z-10"
            />
            
            {/* Additional ambient glow */}
            <div className="absolute -inset-8 rounded-full bg-gradient-radial from-yellow-400/5 to-transparent blur-2xl -z-20" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PotDisplay;