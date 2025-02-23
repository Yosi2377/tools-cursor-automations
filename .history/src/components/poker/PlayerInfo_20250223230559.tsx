import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '@/types/poker';

interface PlayerInfoProps {
  player: Player;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player }) => {
  const isBot = player.name.startsWith('Bot');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        relative flex flex-col items-center justify-center
      `}
    >
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
        <div className={`
          w-full h-full 
          flex items-center justify-center 
          text-white/90 font-bold
          ${isBot ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500' : 'bg-black/60'}
          text-sm sm:text-base md:text-lg
        `}>
          {player.name.slice(0, 2)}
        </div>
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
    </motion.div>
  );
};

export default PlayerInfo;