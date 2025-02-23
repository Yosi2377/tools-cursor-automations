import React from 'react';
import { GameContext } from '@/types/poker';
import PlayerSpot from '../PlayerSpot';
import CommunityCards from './CommunityCards';
import PotDisplay from './PotDisplay';
import TableFelt from './TableFelt';
import { motion, AnimatePresence } from 'framer-motion';

interface TableLayoutProps {
  gameContext: GameContext;
  onTimeout: () => void;
}

const TableLayout: React.FC<TableLayoutProps> = ({ gameContext, onTimeout }) => {
  const positions = [
    'bottom', 'bottomRight', 'right', 'topRight',
    'top', 'topLeft', 'left', 'bottomLeft'
  ];

  // Calculate positions for each spot
  const getSpotPosition = (position: string) => {
    switch (position) {
      case 'bottom':
        return 'bottom-[5%] left-1/2 -translate-x-1/2';
      case 'bottomRight':
        return 'bottom-[30%] right-[5%] translate-x-0';
      case 'right':
        return 'top-1/2 right-[5%] -translate-y-1/2 translate-x-0';
      case 'topRight':
        return 'top-[30%] right-[5%] translate-x-0';
      case 'top':
        return 'top-[5%] left-1/2 -translate-x-1/2';
      case 'topLeft':
        return 'top-[30%] left-[5%] -translate-x-0';
      case 'left':
        return 'left-[5%] top-1/2 -translate-y-1/2 -translate-x-0';
      case 'bottomLeft':
        return 'bottom-[30%] left-[5%] -translate-x-0';
      default:
        return '';
    }
  };

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
        className="game-table-container relative w-[900px] h-[580px]"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 20 }}
      >
        {/* Table surface with improved gradients and effects */}
        <div className="absolute inset-[10%] rounded-[200px] overflow-hidden">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-radial from-emerald-800 via-green-900 to-emerald-950" />
          
          {/* Enhanced felt texture */}
          <div className="absolute inset-0 bg-[url('/felt-texture.png')] opacity-30 mix-blend-overlay" />
          
          {/* Dynamic lighting effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-white/5 to-transparent"
            animate={{
              opacity: [0.1, 0.15, 0.1],
              scale: [1, 1.05, 1]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
          
          {/* Table border with metallic effect */}
          <div className="absolute inset-0 border-[10px] border-[#654321] rounded-[200px]
            shadow-[inset_0_0_40px_rgba(0,0,0,0.5),0_0_40px_rgba(0,0,0,0.5)]
            bg-gradient-to-b from-[#876543]/20 via-[#654321]/20 to-[#432100]/20" />
          
          {/* Ambient light reflection */}
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-white/10 to-transparent"
            animate={{
              opacity: [0.05, 0.1, 0.05],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 8,
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
              className={`absolute ${getSpotPosition(position)}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                damping: 15,
                delay: index * 0.1
              }}
            >
              <div className="scale-90"> {/* Reduce player size by 10% */}
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

        {/* Enhanced table logo with dynamic effects */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full 
            bg-gradient-radial from-transparent to-black/20 flex items-center justify-center pointer-events-none"
          animate={{
            boxShadow: [
              "0 0 15px rgba(255,255,255,0.1)",
              "0 0 25px rgba(255,255,255,0.15)",
              "0 0 15px rgba(255,255,255,0.1)"
            ]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          <motion.span 
            className="text-white/10 text-2xl font-bold italic"
            animate={{
              opacity: [0.1, 0.15, 0.1],
              rotate: -45
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            POKER
          </motion.span>
        </motion.div>

        {/* Ambient light effects */}
        <div className="absolute inset-0 rounded-[200px] pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-emerald-500/5 to-transparent blur-xl"
            animate={{
              opacity: [0.3, 0.4, 0.3],
              scale: [1, 1.05, 1]
            }}
            transition={{
              duration: 7,
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