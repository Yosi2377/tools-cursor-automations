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
    <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-6 md:p-8">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-[800px] h-[500px] sm:h-[550px] md:h-[600px]"
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
        
        {/* Table felt with enhanced shadow */}
        <div className="relative w-full h-full shadow-[0_0_100px_rgba(0,0,0,0.5)]">
          <TableFelt />
          
          {/* Player spots with animations */}
          <AnimatePresence>
            {positions.map((position, index) => {
              const player = gameContext.players.find(p => p.position === position);
              if (!player) return null;
              
              return (
                <motion.div
                  key={position}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className={`absolute ${getSpotPosition(position)}`}
                >
                  <PlayerSpot
                    player={player}
                    onTimeout={onTimeout}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {/* Center area with community cards and pot */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-10"
          >
            <div className="relative">
              <CommunityCards cards={gameContext.communityCards} />
              {/* Cards reflection effect */}
              <div className="absolute top-full left-0 right-0 h-12 bg-gradient-to-b from-white/10 to-transparent transform -scale-y-100 opacity-50 blur-sm" />
            </div>
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.3 }}
            >
              <PotDisplay pot={gameContext.pot} rake={gameContext.rake} />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default TableLayout;