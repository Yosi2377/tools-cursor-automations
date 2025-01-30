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
    switch (player.position) {
      case 'bottom':
        return 'bottom-8 left-1/2 -translate-x-1/2 transform';
      case 'bottomLeft':
        return `${isMobile ? 'bottom-32' : 'bottom-40'} left-24`;
      case 'left':
        return `${isMobile ? 'left-8' : 'left-12'} top-1/2 -translate-y-1/2 transform`;
      case 'topLeft':
        return `${isMobile ? 'top-32' : 'top-40'} left-24`;
      case 'top':
        return 'top-8 left-1/2 -translate-x-1/2 transform';
      case 'topRight':
        return `${isMobile ? 'top-32' : 'top-40'} right-24`;
      case 'right':
        return `${isMobile ? 'right-8' : 'right-12'} top-1/2 -translate-y-1/2 transform`;
      case 'bottomRight':
        return `${isMobile ? 'bottom-32' : 'bottom-40'} right-24`;
      case 'leftTop':
        return `${isMobile ? 'left-24 top-1/3' : 'left-40 top-1/3'}`;
      case 'leftBottom':
        return `${isMobile ? 'left-24 bottom-1/3' : 'left-40 bottom-1/3'}`;
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

  // Move inactive players slightly away from the table
  const getInactiveOffset = () => {
    if (!player.isActive) {
      switch (player.position) {
        case 'bottom':
          return 'translate-y-8';
        case 'bottomLeft':
        case 'bottomRight':
          return 'translate-y-6 translate-x-6';
        case 'left':
          return '-translate-x-8';
        case 'right':
          return 'translate-x-8';
        case 'topLeft':
        case 'topRight':
          return '-translate-y-6 translate-x-6';
        case 'top':
          return '-translate-y-8';
        case 'leftTop':
        case 'leftBottom':
          return '-translate-x-6';
        default:
          return '';
      }
    }
    return '';
  };

  return (
    <div 
      className={`absolute ${getPositionClasses()} flex flex-col items-center gap-2 transition-all duration-300 ${inactiveStyles} ${getInactiveOffset()}`}
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