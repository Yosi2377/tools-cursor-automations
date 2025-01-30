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
        return 'bottom-0 left-1/2 -translate-x-1/2 transform';
      case 'left':
        return `${isMobile ? 'left-4' : 'left-0'} top-1/2 -translate-y-1/2 transform`;
      case 'top':
        return 'top-0 left-1/2 -translate-x-1/2 transform';
      case 'right':
        return `${isMobile ? 'right-4' : 'right-0'} top-1/2 -translate-y-1/2 transform`;
      default:
        return '';
    }
  };

  const getCardPositionClasses = () => {
    if (player.position === 'bottom') {
      return 'top-[80%] translate-x-4'; // Moved slightly to the right
    }
    return 'top-0 -translate-y-full'; // Keep original positioning for other players
  };

  const shouldShowFaceUp = player.position === 'bottom';

  return (
    <div className={`absolute ${getPositionClasses()} flex flex-col items-center gap-2`}>
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