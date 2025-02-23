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
      <div className="game-table-container relative w-[1100px] h-[700px] bg-gradient-radial from-emerald-800 via-green-900 to-emerald-950 
        rounded-[250px] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-[12px] border-[#654321]">
        
        {/* Inner felt texture */}
        <div className="absolute inset-4 rounded-[200px] bg-opacity-20 bg-[url('/felt-texture.png')] mix-blend-overlay" />

        {/* Player positions */}
        {positions.map((position, index) => {
          const player = gameContext.players.find(p => p.position === position);
          if (!player) return null;
          
          return (
            <div key={position} className={`absolute ${getSpotPosition(position)}`}>
              <PlayerSpot player={player} onTimeout={onTimeout} />
            </div>
          );
        })}

        {/* Center area */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6">
          <CommunityCards cards={gameContext.communityCards} />
          <PotDisplay pot={gameContext.pot} rake={gameContext.rake} />
        </div>

        {/* Table logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full 
          bg-gradient-radial from-transparent to-black/20 flex items-center justify-center pointer-events-none">
          <span className="text-white/10 text-2xl font-bold italic transform -rotate-45">POKER</span>
        </div>
      </div>
    </div>
  );
};

export default TableLayout;