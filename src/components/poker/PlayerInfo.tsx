import React from 'react';
import { Player } from '@/types/poker';
import { Avatar } from '@/components/ui/avatar';
import TurnTimer from './TurnTimer';

interface PlayerInfoProps {
  player: Player;
  onTimeout?: () => void;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, onTimeout }) => {
  return (
    <div className="relative flex flex-col items-center">
      <div className="w-12 h-12 rounded-full bg-black/40 border border-white/20 flex items-center justify-center overflow-hidden">
        <Avatar className="w-10 h-10">
          <div className="w-full h-full bg-black/60 flex items-center justify-center text-white/90 text-sm">
            {player.name.slice(0, 2)}
          </div>
        </Avatar>
      </div>
      
      <div className="mt-1 text-center">
        <div className="text-sm text-white/90 font-medium">{player.name}</div>
        <div className="text-xs text-white/70">${player.chips}</div>
        {player.currentBet > 0 && (
          <div className="text-xs text-poker-accent">Bet: ${player.currentBet}</div>
        )}
      </div>

      {player.isTurn && onTimeout && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2">
          <TurnTimer 
            isActive={player.isTurn} 
            onTimeout={onTimeout}
            duration={30}
          />
        </div>
      )}
    </div>
  );
};

export default PlayerInfo;