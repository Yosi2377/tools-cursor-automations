import React, { useEffect, useState } from 'react';
import { Player } from '@/types/poker';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import PlayerCard from './poker/PlayerCard';
import PlayerInfo from './poker/PlayerInfo';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlayerSpotProps {
  player: Player;
  onTimeout: () => void;
}

const PlayerSpot: React.FC<PlayerSpotProps> = ({ player, onTimeout }) => {
  const isMobile = useIsMobile();
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    if (player.isTurn && player.isActive) {
      setIsActive(true);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
        setTimeLeft(30);
      };
    } else {
      setIsActive(false);
      setTimeLeft(30);
    }
  }, [player.isTurn, player.isActive, onTimeout]);

  const handleSeatClick = async () => {
    if (!player.isActive) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please login to join the game');
          return;
        }

        const { error } = await supabase
          .from('game_players')
          .update({
            is_active: true,
            user_id: user.id,
          })
          .eq('position', player.position);

        if (error) throw error;
        toast.success('Successfully joined the game');
      } catch (error) {
        console.error('Error joining game:', error);
        toast.error('Failed to join the game');
      }
    }
  };

  const getPositionClasses = () => {
    const baseClasses = 'absolute transition-all duration-500';
    const activeClasses = player.isActive ? 'z-10' : 'opacity-70 hover:opacity-100 cursor-pointer';
    
    switch (player.position) {
      case 'bottom':
        return `${baseClasses} ${activeClasses} bottom-2 sm:bottom-3 md:bottom-4 left-1/2 -translate-x-1/2`;
      case 'bottomLeft':
        return `${baseClasses} ${activeClasses} bottom-12 sm:bottom-14 md:bottom-16 left-12 sm:left-14 md:left-16 -translate-x-1/2`;
      case 'left':
        return `${baseClasses} ${activeClasses} left-6 sm:left-7 md:left-8 top-1/2 -translate-y-1/2`;
      case 'topLeft':
        return `${baseClasses} ${activeClasses} top-12 sm:top-14 md:top-16 left-12 sm:left-14 md:left-16 -translate-x-1/2`;
      case 'top':
        return `${baseClasses} ${activeClasses} top-2 sm:top-3 md:top-4 left-1/2 -translate-x-1/2`;
      case 'topRight':
        return `${baseClasses} ${activeClasses} top-12 sm:top-14 md:top-16 right-12 sm:right-14 md:right-16 translate-x-1/2`;
      case 'right':
        return `${baseClasses} ${activeClasses} right-6 sm:right-7 md:right-8 top-1/2 -translate-y-1/2`;
      case 'bottomRight':
        return `${baseClasses} ${activeClasses} bottom-12 sm:bottom-14 md:bottom-16 right-12 sm:right-14 md:right-16 translate-x-1/2`;
      default:
        return baseClasses;
    }
  };

  const getCardPositionClasses = () => {
    if (player.position === 'bottom') {
      return 'top-full mt-2';
    }
    return 'top-0 -translate-y-full';
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className={cn(
        "relative w-32 h-32 rounded-full flex flex-col items-center justify-center",
        "bg-gradient-to-b from-gray-900/90 to-gray-800/90",
        "border-2 transition-all duration-300",
        player.isActive ? "border-green-500" : "border-gray-700",
        player.isTurn ? "ring-4 ring-yellow-400/50" : ""
      )}
    >
      {/* Player avatar with glow effect */}
      <div className="relative">
        <motion.div
          animate={{
            boxShadow: player.isTurn
              ? [
                  "0 0 20px rgba(234, 179, 8, 0.5)",
                  "0 0 30px rgba(234, 179, 8, 0.3)",
                  "0 0 20px rgba(234, 179, 8, 0.5)",
                ]
              : "none",
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-600"
        >
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {player.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Player name and chips */}
      <div className="mt-2 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-white font-semibold text-sm mb-1">{player.name}</p>
          <p className="text-yellow-400 text-xs font-medium">
            ${player.chips.toLocaleString()}
          </p>
        </motion.div>
      </div>

      {/* Current bet display */}
      <AnimatePresence>
        {player.currentBet > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1 rounded-full"
          >
            <span className="text-yellow-400 text-xs font-medium">
              ${player.currentBet}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer ring */}
      {player.isTurn && player.isActive && (
        <svg
          className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)]"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="rgba(234, 179, 8, 0.2)"
            strokeWidth="2"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="#eab308"
            strokeWidth="2"
            strokeDasharray="301.59"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: 301.59 }}
            transition={{ duration: 30, ease: "linear" }}
            style={{
              transformOrigin: "center",
              transform: "rotate(-90deg)",
            }}
          />
        </svg>
      )}

      {/* Action indicator */}
      <AnimatePresence>
        {player.lastAction && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1 rounded-full"
          >
            <span className="text-white text-xs font-medium uppercase">
              {player.lastAction}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {!player.isActive ? (
        <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full bg-black/40 border border-white/20 flex flex-col items-center justify-center text-white/50 hover:text-white/80 transition-colors">
          <span className="text-[10px] sm:text-xs">Empty</span>
          <span className="text-[8px] sm:text-[10px]">Click to join</span>
        </div>
      ) : (
        <PlayerInfo player={player} onTimeout={onTimeout} />
      )}
      
      {player.cards.length > 0 && (
        <div className={`absolute left-1/2 transform -translate-x-1/2 mt-1 sm:mt-1.5 md:mt-2 flex gap-0.5 sm:gap-1 ${getCardPositionClasses()}`}>
          {player.cards.map((card, index) => (
            <PlayerCard
              key={index}
              card={card}
              index={index}
              shouldShowFaceUp={player.position === 'bottom'}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default PlayerSpot;