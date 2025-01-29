import React from 'react';
import { User } from 'lucide-react';

interface PlayerProps {
  player: {
    id: number;
    name: string;
    chips: number;
    position: string;
  };
}

const PlayerSpot: React.FC<PlayerProps> = ({ player }) => {
  const positions = {
    bottom: "bottom-8 left-1/2 -translate-x-1/2",
    left: "left-8 top-1/2 -translate-y-1/2",
    top: "top-8 left-1/2 -translate-x-1/2",
    right: "right-8 top-1/2 -translate-y-1/2",
  };

  return (
    <div className={`absolute ${positions[player.position as keyof typeof positions]}`}>
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-black/30 flex items-center justify-center border-2 border-poker-accent">
          <User className="w-8 h-8 text-poker-accent" />
        </div>
        <div className="text-white text-sm font-medium">{player.name}</div>
        <div className="text-poker-accent font-bold">${player.chips}</div>
        
        {/* Player cards */}
        <div className="flex gap-1 -mt-1">
          {[1, 2].map((card) => (
            <div
              key={card}
              className="w-10 h-14 bg-white rounded-md shadow-lg animate-card-deal"
              style={{ animationDelay: `${card * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerSpot;