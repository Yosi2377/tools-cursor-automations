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
    <div className={`relative p-4 rounded-lg ${
      player.isTurn ? 'bg-poker-accent/20 animate-pulse' : 'bg-black/20'
    }`}>
      <Avatar className="w-16 h-16 border-2 border-poker-accent">
        <AvatarFallback className="bg-poker-background text-poker-accent">
          {player.name[0]}
        </AvatarFallback>
      </Avatar>
      
      {player.isTurn && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
          <TurnTimer 
            isActive={player.isTurn} 
            onTimeout={onTimeout}
          />
        </div>
      )}

      <div className="mt-2 text-center">
        <p className="text-poker-accent font-semibold">{player.name}</p>
        <p className="text-sm text-poker-accent/80">${player.chips}</p>
        {player.currentBet > 0 && (
          <p className="text-xs text-poker-accent/60">Bet: ${player.currentBet}</p>
        )}
      </div>
    </div>
  );
};

export default PlayerInfo;