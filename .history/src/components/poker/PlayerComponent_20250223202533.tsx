import React from 'react';
import { Player } from '@/types/poker';
import PlayerInfo from './PlayerInfo';
import { PlayerCards } from './PlayerCards';
import TurnTimer from './TurnTimer';

interface PlayerComponentProps {
  player: Player;
  position: number;
  isCurrentPlayer: boolean;
}

const PlayerComponent: React.FC<PlayerComponentProps> = ({
  player,
  position,
  isCurrentPlayer
}) => {
  const getPlayerPosition = (position: number) => {
    const positions = {
      0: 'bottom-1/2 left-1/2 transform -translate-x-1/2 translate-y-32',  // Bottom center
      1: 'bottom-1/4 left-1/4',  // Bottom left
      2: 'top-1/2 left-0 transform -translate-y-1/2',  // Left
      3: 'top-1/4 left-1/4',  // Top left
      4: 'top-0 left-1/2 transform -translate-x-1/2',  // Top center
      5: 'top-1/4 right-1/4',  // Top right
      6: 'top-1/2 right-0 transform -translate-y-1/2',  // Right
      7: 'bottom-1/4 right-1/4',  // Bottom right
    };
    return positions[position as keyof typeof positions] || positions[0];
  };

  return (
    <div className={`absolute ${getPlayerPosition(position)} flex flex-col items-center`}>
      <div className="relative">
        <PlayerInfo player={player} />
        <PlayerCards cards={player.cards} faceUp={player.id === 'user'} />
        {isCurrentPlayer && <TurnTimer onTimeout={() => {}} isActive={player.isActive} />}
      </div>
    </div>
  );
};

export default PlayerComponent; 