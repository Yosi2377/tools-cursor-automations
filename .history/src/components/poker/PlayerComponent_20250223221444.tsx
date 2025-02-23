import React from 'react';
import { motion } from 'framer-motion';
import { Player, PlayerPosition } from '@/types/poker';
import PlayerInfo from './PlayerInfo';
import PlayerCards from './PlayerCards';
import TurnTimer from './TurnTimer';

interface PlayerComponentProps {
  player: Player;
  position: PlayerPosition;
  isCurrentPlayer: boolean;
}

const getPlayerPosition = (position: PlayerPosition): string => {
  const positions: Record<PlayerPosition, string> = {
    'bottom': 'bottom-0 left-1/2 -translate-x-1/2',
    'bottomRight': 'bottom-1/4 right-0',
    'right': 'right-0 top-1/2 -translate-y-1/2',
    'topRight': 'top-1/4 right-0',
    'top': 'top-0 left-1/2 -translate-x-1/2',
    'topLeft': 'top-1/4 left-0',
    'left': 'left-0 top-1/2 -translate-y-1/2',
    'bottomLeft': 'bottom-1/4 left-0'
  };
  return positions[position];
};

const PlayerComponent: React.FC<PlayerComponentProps> = ({ player, position, isCurrentPlayer }) => {
  // Always show bots and active players
  const shouldShow = player.isVisible || player.name.startsWith('Bot');
  if (!shouldShow) return null;

  const positionClasses = getPlayerPosition(position);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`absolute ${positionClasses} flex flex-col items-center justify-center z-30`}
    >
      <PlayerInfo player={player} isCurrentPlayer={isCurrentPlayer} />
      <PlayerCards cards={player.cards} faceUp={player.hasFolded} />
      {isCurrentPlayer && <TurnTimer />}

      {/* Current bet display */}
      {player.currentBet > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-8 bg-black/50 text-white px-2 py-1 rounded text-sm"
        >
          ${player.currentBet}
        </motion.div>
      )}

      {/* Last action display */}
      {player.lastAction && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-8 bg-black/50 text-white px-2 py-1 rounded text-sm"
        >
          {player.lastAction}
        </motion.div>
      )}
    </motion.div>
  );
};

export default PlayerComponent; 