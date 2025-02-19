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
            className="relative"
          >
            {/* Pot container with glow effect */}
            <div className={cn(
              "px-4 py-2 rounded-full",
              "bg-gradient-to-r from-yellow-600/80 to-yellow-500/80",
              "backdrop-blur-sm shadow-lg",
              "border border-yellow-400/30",
              "flex items-center gap-2"
            )}>
              {/* Chips icon */}
              <div className="relative w-6 h-6">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="absolute inset-0"
                >
                  <div className="w-full h-full rounded-full bg-yellow-400 border-2 border-yellow-500 shadow-inner" />
                  <div className="absolute inset-1 rounded-full border border-yellow-300/50" />
                </motion.div>
              </div>

              {/* Pot amount with animation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white font-bold text-lg"
              >
                ${pot.toLocaleString()}
              </motion.div>
            </div>

            {/* Rake display if applicable */}
            {rake > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
              >
                <span className="text-gray-400 text-xs">
                  Rake: ${rake.toLocaleString()}
                </span>
              </motion.div>
            )}

            {/* Decorative elements */}
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="absolute -inset-2 rounded-full bg-yellow-400/20 blur-xl -z-10"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PotDisplay;