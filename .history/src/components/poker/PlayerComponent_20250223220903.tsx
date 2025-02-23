import React from 'react';
import { Player } from '@/types/poker';
import PlayerInfo from './PlayerInfo';
import PlayerCards from './PlayerCards';
import TurnTimer from './TurnTimer';
import { motion } from 'framer-motion';

interface PlayerComponentProps {
  player: Player;
  position: string;
  isCurrentPlayer: boolean;
}

const PlayerComponent: React.FC<PlayerComponentProps> = ({
  player,
  position,
  isCurrentPlayer
}) => {
  const getPlayerPosition = (position: string) => {
    const positions = {
      'bottom': 'bottom-1/2 left-1/2 transform -translate-x-1/2 translate-y-32',
      'bottomRight': 'bottom-1/4 right-1/4',
      'right': 'top-1/2 right-0 transform -translate-y-1/2',
      'topRight': 'top-1/4 right-1/4',
      'top': 'top-0 left-1/2 transform -translate-x-1/2',
      'topLeft': 'top-1/4 left-1/4',
      'left': 'top-1/2 left-0 transform -translate-y-1/2',
      'bottomLeft': 'bottom-1/4 left-1/4'
    };
    return positions[position] || positions['bottom'];
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`absolute ${getPlayerPosition(position)} flex flex-col items-center`}
    >
      <div className={`relative ${isCurrentPlayer ? 'z-20' : 'z-10'}`}>
        <PlayerInfo player={player} />
        <PlayerCards 
          cards={player.cards} 
          faceUp={player.position === 'bottom'} 
        />
        {isCurrentPlayer && (
          <TurnTimer 
            onTimeout={() => {}} 
            isActive={player.isActive && player.isTurn} 
          />
        )}
        {player.currentBet > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 px-3 py-1 rounded-full"
          >
            <span className="text-amber-400 text-sm font-bold">${player.currentBet}</span>
          </motion.div>
        )}
        {player.lastAction && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 px-3 py-1 rounded-full"
          >
            <span className="text-emerald-400 text-sm font-bold uppercase">{player.lastAction}</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default PlayerComponent; 