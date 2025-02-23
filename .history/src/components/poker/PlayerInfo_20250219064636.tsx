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
      <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full bg-black/40 border border-white/20 flex items-center justify-center overflow-hidden">
        <Avatar className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10">
          <div className="w-full h-full bg-black/60 flex items-center justify-center text-white/90 text-xs sm:text-sm">
            {player.name.slice(0, 2)}
          </div>
        </Avatar>
      </div>
      
      <div className="mt-0.5 sm:mt-1 text-center">
        <div className="text-xs sm:text-sm text-white/90 font-medium">{player.name}</div>
        <div className="text-[10px] sm:text-xs text-white/70">${player.chips}</div>
        {player.currentBet > 0 && (
          <div className="text-[10px] sm:text-xs text-poker-accent">Bet: ${player.currentBet}</div>
        )}
      </div>

      {player.isTurn && onTimeout && (
        <div className="absolute -top-6 sm:-top-7 md:-top-8 left-1/2 -translate-x-1/2">
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