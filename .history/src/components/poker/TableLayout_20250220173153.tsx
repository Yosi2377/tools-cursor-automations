import React from 'react';
import { GameContext, PlayerPosition } from '@/types/poker';
import PlayerSpot from '../PlayerSpot';
import CommunityCards from './CommunityCards';
import PotDisplay from './PotDisplay';
import TableFelt from './TableFelt';
import { motion, AnimatePresence } from 'framer-motion';
import { getPlayerPosition } from '@/utils/getPlayerPosition';

interface TableLayoutProps {
  gameContext: GameContext;
  onTimeout: () => void;
}

const TableLayout: React.FC<TableLayoutProps> = ({ gameContext, onTimeout }) => {
  const positions: PlayerPosition[] = [
    'bottom', 'bottomLeft', 'left', 'topLeft', 'top', 'topRight', 'right', 'bottomRight', 'leftTop'
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
    >
      {/* Enhanced background with dynamic gradient */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/85 to-black/90"
        animate={{
          background: [
            'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.9), rgba(0,0,0,0.95))',
            'radial-gradient(circle at 48% 48%, rgba(0,0,0,0.9), rgba(0,0,0,0.95))',
            'radial-gradient(circle at 52% 52%, rgba(0,0,0,0.9), rgba(0,0,0,0.95))',
            'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.9), rgba(0,0,0,0.95))',
          ]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />

      {/* Main table container with enhanced styling */}
      <motion.div 
        className="game-table-container relative w-[1000px] h-[600px]"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
      >
        {/* Table surface with improved gradients and effects */}
        <div className="absolute inset-[15%] rounded-[250px] overflow-hidden">
          {/* Base gradient with enhanced colors */}
          <div className="absolute inset-0 bg-gradient-radial from-emerald-700 via-green-800 to-emerald-900" />
          
          {/* Enhanced felt texture with better blending */}
          <div className="absolute inset-0 bg-[url('/felt-texture.png')] opacity-40 mix-blend-overlay" />
          
          {/* Dynamic lighting effect with improved animation */}
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-white/10 to-transparent"
            animate={{
              opacity: [0.1, 0.2, 0.1],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
          
          {/* Table border with enhanced metallic effect */}
          <div className="absolute inset-0 border-[12px] border-[#876543] rounded-[200px]
            shadow-[inset_0_0_50px_rgba(0,0,0,0.5),0_0_50px_rgba(0,0,0,0.5)]
            bg-gradient-to-b from-[#987654]/30 via-[#876543]/30 to-[#654321]/30" />
          
          {/* Enhanced ambient light reflection */}
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-white/15 to-transparent"
            animate={{
              opacity: [0.1, 0.15, 0.1],
              scale: [1, 1.15, 1]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
        </div>

        {/* Player positions with enhanced animations */}
        {positions.map((position, index) => {
          const player = gameContext.players.find(p => p.position === position);
          if (!player) return null;
          
          return (
            <motion.div
              key={position}
              className={`absolute ${getPlayerPosition(position)}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                damping: 15,
                delay: index * 0.1
              }}
            >
              <div className="scale-75"> {/* Reduce player size by 25% */}
                <PlayerSpot player={player} onTimeout={onTimeout} />
              </div>
            </motion.div>
          );
        })}

        {/* Center area with improved layout */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <CommunityCards cards={gameContext.communityCards} />
          <PotDisplay pot={gameContext.pot} rake={gameContext.rake} />
        </motion.div>

        {/* Enhanced table logo with improved effects */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full 
            bg-gradient-radial from-transparent to-black/30 flex items-center justify-center pointer-events-none"
          animate={{
            boxShadow: [
              "0 0 20px rgba(255,255,255,0.1)",
              "0 0 35px rgba(255,255,255,0.2)",
              "0 0 20px rgba(255,255,255,0.1)"
            ]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          <motion.span 
            className="text-white/15 text-3xl font-bold italic tracking-wider"
            animate={{
              opacity: [0.1, 0.2, 0.1],
              rotate: -30,
              scale: [0.95, 1.05, 0.95]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            POKER
          </motion.span>
        </motion.div>

        {/* Enhanced ambient light effects */}
        <div className="absolute inset-0 rounded-[200px] pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-emerald-500/10 to-transparent blur-2xl"
            animate={{
              opacity: [0.3, 0.5, 0.3],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TableLayout;