import React from 'react';
import { Player } from '@/types/poker';
import { Avatar } from '@/components/ui/avatar';
import TurnTimer from './TurnTimer';
import { motion } from 'framer-motion';

interface PlayerInfoProps {
  player: Player;
  onTimeout?: () => void;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, onTimeout }) => {
  const isBot = player.name.startsWith('Bot');
  
  return (
    <div className="relative flex flex-col items-center">
      <motion.div 
        initial={{ scale: 0.8 }}
        animate={{ 
          scale: 1,
          borderColor: player.isActive ? 'rgb(16, 185, 129)' : 'rgba(255, 255, 255, 0.2)'
        }}
        className={`
          w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 
          rounded-full 
          bg-gradient-to-br from-slate-900 to-slate-800
          border-2 transition-colors duration-300
          flex items-center justify-center 
          overflow-hidden
          ${player.isActive ? 'border-emerald-500' : 'border-white/20'}
          ${player.isTurn ? 'ring-4 ring-amber-400/50' : ''}
        `}
      >
        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14">
          <div className={`
            w-full h-full 
            flex items-center justify-center 
            text-white/90 font-bold
            ${isBot ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500' : 'bg-black/60'}
            text-sm sm:text-base md:text-lg
          `}>
            {player.name.slice(0, 2)}
          </div>
        </Avatar>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-1 sm:mt-2 text-center"
      >
        <div className="text-sm sm:text-base text-white/90 font-medium drop-shadow-lg">
          {player.name}
        </div>
        <div className="text-xs sm:text-sm text-amber-400 font-semibold tracking-wide">
          ${player.chips.toLocaleString()}
        </div>
      </motion.div>

      {player.isTurn && onTimeout && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-8 sm:-top-10 md:-top-12 left-1/2 -translate-x-1/2"
        >
          <TurnTimer 
            isActive={player.isTurn} 
            onTimeout={onTimeout}
            duration={30}
          />
        </motion.div>
      )}
    </div>
  );
};

export default PlayerInfo;