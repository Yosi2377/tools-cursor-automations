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
        "relative w-36 h-36 rounded-full flex flex-col items-center justify-center",
        "bg-gradient-to-b from-slate-900/95 to-slate-800/95",
        "border-[3px] transition-all duration-300",
        player.isActive ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "border-gray-700",
        player.isTurn ? "ring-4 ring-amber-400/50 shadow-[0_0_25px_rgba(251,191,36,0.4)]" : ""
      )}
      style={{
        backdropFilter: "blur(8px)"
      }}
    >
      {/* Player avatar with enhanced glow effect */}
      <div className="relative">
        <motion.div
          animate={{
            boxShadow: player.isTurn
              ? [
                  "0 0 25px rgba(251,191,36,0.5)",
                  "0 0 35px rgba(251,191,36,0.3)",
                  "0 0 25px rgba(251,191,36,0.5)",
                ]
              : "none",
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="w-20 h-20 rounded-full overflow-hidden border-3 border-gray-600/80"
        >
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
            <span className="text-white font-bold text-xl drop-shadow-lg">
              {player.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Player name and chips with enhanced styling */}
      <div className="mt-3 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-white font-bold text-base mb-1 drop-shadow-lg">{player.name}</p>
          <p className="text-amber-400 text-sm font-semibold tracking-wide drop-shadow">
            ${player.chips.toLocaleString()}
          </p>
        </motion.div>
      </div>

      {/* Enhanced bet display */}
      <AnimatePresence>
        {player.currentBet > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black/90 px-4 py-1.5 rounded-full border border-amber-500/30 shadow-lg"
          >
            <span className="text-amber-400 text-sm font-bold">
              ${player.currentBet}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced timer ring */}
      {player.isTurn && player.isActive && (
        <svg
          className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)]"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="rgba(251,191,36,0.15)"
            strokeWidth="3"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="url(#timerGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="301.59"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: 301.59 }}
            transition={{ duration: 30, ease: "linear" }}
            style={{
              transformOrigin: "center",
              transform: "rotate(-90deg)",
            }}
          />
          <defs>
            <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {/* Enhanced action indicator */}
      <AnimatePresence>
        {player.lastAction && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 px-4 py-1.5 rounded-full border border-emerald-500/30 shadow-lg"
          >
            <span className="text-emerald-400 text-sm font-bold uppercase tracking-wide">
              {player.lastAction}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {!player.isActive ? (
        <div className="w-12 h-12 rounded-full bg-black/60 border border-white/30 flex flex-col items-center justify-center 
          text-white/60 hover:text-white/90 hover:border-white/50 hover:bg-black/70 transition-all duration-300 cursor-pointer
          transform hover:scale-105 shadow-lg">
          <span className="text-xs font-medium">Empty</span>
          <span className="text-[10px] opacity-80">Click to join</span>
        </div>
      ) : (
        <PlayerInfo player={player} onTimeout={onTimeout} />
      )}
      
      {/* Enhanced card display */}
      {player.cards.length > 0 && (
        <div className={`absolute left-1/2 transform -translate-x-1/2 mt-2 flex gap-1.5 ${getCardPositionClasses()}`}>
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