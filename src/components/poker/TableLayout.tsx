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
      <TableFelt>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[900px] h-[500px]">
            {positions.map((position, index) => {
              const player = gameContext.players.find(p => p.position === position);
              const isCurrentPlayer = index === gameContext.currentPlayer;
              const isBot = player?.name?.startsWith('Bot') || false;

              return (
                <PlayerSpot
                  key={position}
                  position={position}
                  player={player}
                  isCurrentPlayer={isCurrentPlayer}
                  onTimeout={onTimeout}
                  isBot={isBot}
                />
              );
            })}
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
              <CommunityCards cards={gameContext.communityCards} />
              <PotDisplay pot={gameContext.pot} />
            </div>
          </div>
        </div>
      </TableFelt>
    </div>
  );
};

export default TableLayout;