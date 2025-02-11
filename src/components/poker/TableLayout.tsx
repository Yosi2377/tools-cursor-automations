import React from 'react';
import { GameContext } from '@/types/poker';
import PlayerSpot from '../PlayerSpot';
import CommunityCards from './CommunityCards';
import PotDisplay from './PotDisplay';
import TableFelt from './TableFelt';

interface TableLayoutProps {
  gameContext: GameContext;
  onTimeout: () => void;
}

const TableLayout: React.FC<TableLayoutProps> = ({ gameContext, onTimeout }) => {
  const positions = [
    'bottom', 'bottomRight', 'right', 'topRight',
    'top', 'topLeft', 'left', 'bottomLeft'
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-[900px] h-[500px]">
        <TableFelt />
        
        {positions.map((position, index) => {
          const player = gameContext.players.find(p => p.position === position);
          if (!player) return null;
          
          return (
            <PlayerSpot
              key={position}
              player={player}
              onTimeout={onTimeout}
            />
          );
        })}
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
          <CommunityCards cards={gameContext.communityCards} />
          <PotDisplay pot={gameContext.pot} rake={gameContext.rake} />
        </div>
      </div>
    </div>
  );
};

export default TableLayout;