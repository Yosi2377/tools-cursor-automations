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
      // Position inactive players off the table
      switch (player.position) {
        case 'bottom':
          return 'bottom-0 left-1/2 -translate-x-1/2 transform translate-y-full';
        case 'bottomLeft':
          return 'bottom-0 left-0';
        case 'left':
          return 'left-0 top-1/2 -translate-y-1/2 -translate-x-full';
        case 'topLeft':
          return 'top-0 left-0';
        case 'top':
          return 'top-0 left-1/2 -translate-x-1/2 -translate-y-full';
        case 'topRight':
          return 'top-0 right-0';
        case 'right':
          return 'right-0 top-1/2 -translate-y-1/2 translate-x-full';
        case 'bottomRight':
          return 'bottom-0 right-0';
        case 'leftTop':
          return 'left-0 top-1/4 -translate-x-full';
        case 'leftBottom':
          return 'left-0 bottom-1/4 -translate-x-full';
        default:
          return '';
      }
    }

    // Position active players on the table in a more spread out pattern
    switch (player.position) {
      case 'bottom':
        return 'bottom-32 left-1/2 -translate-x-1/2 transform';
      case 'top':
        return 'top-32 left-1/2 -translate-x-1/2 transform';
      case 'left':
        return `${isMobile ? 'left-24' : 'left-48'} top-1/2 -translate-y-1/2`;
      case 'right':
        return `${isMobile ? 'right-24' : 'right-48'} top-1/2 -translate-y-1/2`;
      case 'topLeft':
        return `${isMobile ? 'left-32 top-48' : 'left-64 top-48'}`;
      case 'topRight':
        return `${isMobile ? 'right-32 top-48' : 'right-64 top-48'}`;
      case 'bottomLeft':
        return `${isMobile ? 'left-32 bottom-48' : 'left-64 bottom-48'}`;
      case 'bottomRight':
        return `${isMobile ? 'right-32 bottom-48' : 'right-64 bottom-48'}`;
      case 'leftTop':
        return `${isMobile ? 'left-48 top-1/3' : 'left-72 top-1/3'}`;
      case 'leftBottom':
        return `${isMobile ? 'left-48 bottom-1/3' : 'left-72 bottom-1/3'}`;
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

  // Add opacity and grayscale for inactive players
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