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
        return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/4';
      case 'bottomRight':
        return 'bottom-[15%] right-0 translate-x-1/4';
      case 'right':
        return 'right-0 top-1/2 -translate-y-1/2 translate-x-1/4';
      case 'topRight':
        return 'top-[15%] right-0 translate-x-1/4';
      case 'top':
        return 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/4';
      case 'topLeft':
        return 'top-[15%] left-0 -translate-x-1/4';
      case 'left':
        return 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/4';
      case 'bottomLeft':
        return 'bottom-[15%] left-0 -translate-x-1/4';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-gradient-to-b from-black/80 to-black/95">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-[1100px] h-[700px] p-8"
      >
        {/* Table felt background with enhanced styling */}
        <div className="game-table-container relative w-full h-full bg-gradient-radial from-emerald-800 via-green-900 to-emerald-950 
          rounded-[250px] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-[12px] border-[#654321] 
          before:content-[''] before:absolute before:inset-0 before:rounded-[238px] before:bg-gradient-to-b 
          before:from-white/5 before:to-transparent before:pointer-events-none">
          
          {/* Decorative rim highlight */}
          <div className="absolute inset-[-2px] rounded-[245px] bg-gradient-to-b from-amber-700/50 to-transparent pointer-events-none" />
          
          {/* Inner felt texture */}
          <div className="absolute inset-4 rounded-[200px] bg-opacity-20 bg-[url('/felt-texture.png')] mix-blend-overlay" />

          {/* Player positions with enhanced animations */}
          {positions.map((position, index) => {
            const player = gameContext.players.find(p => p.position === position);
            if (!player) return null;
            
            return (
              <motion.div 
                key={position} 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`absolute ${getSpotPosition(position)}`}
              >
                <PlayerSpot player={player} onTimeout={onTimeout} />
              </motion.div>
            );
          })}

          {/* Center area with enhanced styling */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6"
          >
            <CommunityCards cards={gameContext.communityCards} />
            <PotDisplay pot={gameContext.pot} rake={gameContext.rake} />
          </motion.div>

          {/* Table logo/branding */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full 
            bg-gradient-radial from-transparent to-black/20 flex items-center justify-center pointer-events-none">
            <span className="text-white/10 text-2xl font-bold italic transform -rotate-45">POKER</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TableLayout;