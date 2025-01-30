import React from 'react';
import { Player } from '@/types/poker';
import PlayerCard from './poker/PlayerCard';
import PlayerInfo from './poker/PlayerInfo';
import { useIsMobile } from '@/hooks/use-mobile';

interface PlayerSpotProps {
  player: Player;
  onTimeout?: () => void;
}

const PlayerSpot: React.FC<PlayerSpotProps> = ({ player, onTimeout }) => {
  const isMobile = useIsMobile();

  const getPositionClasses = () => {
    if (!player.isActive) {
      switch (player.position) {
        case 'bottom':
          return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-[200%]';
        case 'bottomLeft':
          return 'bottom-0 left-0 -translate-x-[200%] translate-y-[200%]';
        case 'left':
          return 'left-0 top-1/2 -translate-y-1/2 -translate-x-[200%]';
        case 'topLeft':
          return 'top-0 left-0 -translate-x-[200%] -translate-y-[200%]';
        case 'top':
          return 'top-0 left-1/2 -translate-x-1/2 -translate-y-[200%]';
        case 'topRight':
          return 'top-0 right-0 translate-x-[200%] -translate-y-[200%]';
        case 'right':
          return 'right-0 top-1/2 -translate-y-1/2 translate-x-[200%]';
        case 'bottomRight':
          return 'bottom-0 right-0 translate-x-[200%] translate-y-[200%]';
        default:
          return '';
      }
    }

    // Position active players in an oval shape around the table
    switch (player.position) {
      case 'bottom':
        return 'bottom-8 left-1/2 -translate-x-1/2';
      case 'bottomLeft':
        return `${isMobile ? 'left-16 bottom-24' : 'left-24 bottom-32'} -translate-x-1/2`;
      case 'left':
        return `${isMobile ? 'left-8' : 'left-12'} top-1/2 -translate-y-1/2`;
      case 'topLeft':
        return `${isMobile ? 'left-16 top-24' : 'left-24 top-32'} -translate-x-1/2`;
      case 'top':
        return 'top-8 left-1/2 -translate-x-1/2';
      case 'topRight':
        return `${isMobile ? 'right-16 top-24' : 'right-24 top-32'} translate-x-1/2`;
      case 'right':
        return `${isMobile ? 'right-8' : 'right-12'} top-1/2 -translate-y-1/2`;
      case 'bottomRight':
        return `${isMobile ? 'right-16 bottom-24' : 'right-24 bottom-32'} translate-x-1/2`;
      default:
        return '';
    }
  };

  const getCardPositionClasses = () => {
    if (player.position === 'bottom') {
      return 'top-full mt-2';
    }
    return 'top-0 -translate-y-full';
  };

  const shouldShowFaceUp = player.position === 'bottom';
  const inactiveStyles = !player.isActive ? 'opacity-50 grayscale' : '';

  return (
    <div 
      className={`absolute ${getPositionClasses()} flex flex-col items-center gap-2 transition-all duration-500 ${inactiveStyles}`}
    >
      <PlayerInfo player={player} onTimeout={onTimeout} />
      
      {player.cards.length > 0 && (
        <div className={`absolute left-1/2 transform -translate-x-1/2 mt-2 flex gap-1 ${getCardPositionClasses()}`}>
          {player.cards.map((card, index) => (
            <PlayerCard
              key={index}
              card={card}
              index={index}
              shouldShowFaceUp={shouldShowFaceUp}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerSpot;