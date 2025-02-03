import React from 'react';
import { Player } from '@/types/poker';
import { Avatar, AvatarFallback } from '../ui/avatar';
import TurnTimer from './TurnTimer';

interface PlayerInfoProps {
  player: Player;
  onTimeout?: () => void;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, onTimeout }) => {
  return (
    <div className={`relative flex flex-col items-center ${
      player.isTurn ? 'animate-pulse' : ''
    }`}>
      <div className={`p-2 rounded-lg ${
        player.isTurn ? 'bg-poker-accent/20' : 'bg-black/40'
      }`}>
        <Avatar className="w-12 h-12 border border-poker-accent/50">
          <AvatarFallback className="bg-poker-background text-poker-accent text-sm">
            {player.name[0]}
          </AvatarFallback>
        </Avatar>
      </div>
      
      {player.isTurn && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
          <TurnTimer 
            isActive={player.isTurn} 
            onTimeout={onTimeout}
          />
        </div>
      )}

      <div className="mt-1 text-center">
        <p className="text-sm text-poker-accent font-medium truncate max-w-[100px]">{player.name}</p>
        <p className="text-xs text-poker-accent/80">${player.chips}</p>
        {player.currentBet > 0 && (
          <p className="text-xs text-poker-accent/60">Bet: ${player.currentBet}</p>
        )}
      </div>
    </div>
  );
};

export default PlayerInfo;