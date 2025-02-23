import React from 'react';
import { Player, PlayerPosition } from '@/types/poker';
import { Card } from './Card';

interface PlayerComponentProps {
  player: Player;
  position: PlayerPosition;
  isCurrentPlayer: boolean;
}

const PlayerComponent: React.FC<PlayerComponentProps> = ({
  player,
  position,
  isCurrentPlayer
}) => {
  const getPositionStyles = () => {
    switch (position) {
      case 'bottom':
        return 'bottom-0 left-1/2 transform -translate-x-1/2';
      case 'bottomRight':
        return 'bottom-1/4 right-0';
      case 'right':
        return 'right-0 top-1/2 transform -translate-y-1/2';
      case 'topRight':
        return 'top-1/4 right-0';
      case 'top':
        return 'top-0 left-1/2 transform -translate-x-1/2';
      case 'topLeft':
        return 'top-1/4 left-0';
      case 'left':
        return 'left-0 top-1/2 transform -translate-y-1/2';
      case 'bottomLeft':
        return 'bottom-1/4 left-0';
      default:
        return '';
    }
  };

  return (
    <div className={`absolute ${getPositionStyles()}`}>
      <div className={`
        p-4 rounded-lg
        ${isCurrentPlayer ? 'bg-blue-500' : 'bg-gray-700'}
        ${player.hasFolded ? 'opacity-50' : ''}
        text-white
      `}>
        <div className="text-center">
          <div className="font-bold">{player.name}</div>
          <div>Chips: ${player.chips}</div>
          {player.currentBet > 0 && (
            <div>Bet: ${player.currentBet}</div>
          )}
        </div>
        
        {player.cards.length > 0 && (
          <div className="flex gap-2 mt-2">
            {player.cards.map((card, index) => (
              <Card
                key={index}
                suit={card.suit}
                rank={card.rank}
                faceDown={!isCurrentPlayer}
              />
            ))}
          </div>
        )}
        
        {player.lastAction && (
          <div className="mt-2 text-center text-sm">
            {player.lastAction}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerComponent; 