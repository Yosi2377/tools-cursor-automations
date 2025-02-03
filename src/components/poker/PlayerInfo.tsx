import React from 'react';
import { Player } from '@/types/poker';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import TurnTimer from './TurnTimer';

interface PlayerInfoProps {
  player: Player;
  onTimeout?: () => void;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, onTimeout }) => {
  return (
    <div 
      className={cn(
        "relative flex flex-col items-center",
        player.isTurn && "animate-pulse"
      )}
    >
      <div className="relative">
        <Avatar className="w-12 h-12 border-2 border-white/20">
          <AvatarFallback className="bg-black/40 text-white/90">
            {player.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {player.isTurn && onTimeout && (
          <div className="absolute -top-1 -right-1">
            <TurnTimer onTimeout={onTimeout} />
          </div>
        )}
      </div>

      <div className="mt-1 text-center">
        <div className="text-sm font-medium text-white/90">
          {player.name}
        </div>
        <div className="text-xs text-white/60">
          ${player.chips}
        </div>
        {player.currentBet > 0 && (
          <div className="text-xs text-poker-accent">
            Bet: ${player.currentBet}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerInfo;