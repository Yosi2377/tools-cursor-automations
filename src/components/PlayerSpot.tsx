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
      <div className="flex flex-col items-center gap-2 transform hover:scale-105 transition-transform">
        <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border-2 border-poker-accent shadow-lg">
          <User className="w-10 h-10 text-poker-accent" />
        </div>
        <div className="text-white text-base font-medium tracking-wide">{player.name}</div>
        <div className="text-poker-accent font-bold text-lg">${player.chips.toLocaleString()}</div>
        
        {/* Player cards */}
        <div className="flex gap-2 -mt-1">
          {[1, 2].map((card) => (
            <div
              key={card}
              className="w-12 h-16 bg-white rounded-lg shadow-xl animate-card-deal transform hover:rotate-2 transition-transform"
              style={{ 
                animationDelay: `${card * 0.2}s`,
                backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerSpot;