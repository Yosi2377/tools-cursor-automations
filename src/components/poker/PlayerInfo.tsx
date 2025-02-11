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
    <div className="relative group">
      <div className="flex flex-col items-center">
        {/* Timer positioned above avatar */}
        {player.isTurn && onTimeout && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
            <TurnTimer 
              isActive={player.isTurn} 
              onTimeout={onTimeout}
              duration={30}
            />
          </div>
        )}

        {/* Avatar with highlight for active turn */}
        <div className={`
          w-12 h-12 rounded-full 
          ${player.isTurn ? 'bg-poker-accent/20 border-poker-accent' : 'bg-black/40 border-white/20'} 
          border-2 flex items-center justify-center overflow-hidden 
          transition-all duration-300
        `}>
          <Avatar className="w-10 h-10">
            <div className="w-full h-full bg-black/60 flex items-center justify-center text-white/90 text-sm font-medium">
              {player.name.slice(0, 2).toUpperCase()}
            </div>
          </Avatar>
        </div>
        
        {/* Player info with improved spacing */}
        <div className="mt-1 text-center min-w-[80px]">
          <div className="text-sm text-white/90 font-medium truncate px-1">{player.name}</div>
          <div className="text-xs text-white/70 font-medium">${player.chips.toLocaleString()}</div>
        </div>

        {/* Current bet displayed as a badge */}
        {player.currentBet > 0 && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-10">
            <div className="px-2 py-0.5 rounded-full bg-black/60 border border-poker-accent/50">
              <span className="text-xs text-poker-accent font-medium">
                ${player.currentBet.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerInfo;