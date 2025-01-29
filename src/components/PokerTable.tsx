import React from 'react';
import { User, DollarSign } from 'lucide-react';
import PlayerSpot from './PlayerSpot';
import { Button } from '@/components/ui/button';

const PokerTable = () => {
  const players = [
    { id: 1, name: "Player 1", chips: 1000, position: "bottom" },
    { id: 2, name: "Player 2", chips: 1500, position: "left" },
    { id: 3, name: "Player 3", chips: 2000, position: "top" },
    { id: 4, name: "Player 4", chips: 800, position: "right" },
  ];

  return (
    <div className="relative w-full h-screen bg-poker-background p-4">
      <div className="absolute inset-8 bg-poker-table rounded-full border-8 border-poker-accent/20">
        {/* Center pot display */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/30 px-4 py-2 rounded-full">
          <div className="flex items-center gap-2 text-poker-accent">
            <DollarSign className="w-4 h-4" />
            <span className="font-bold">1,200</span>
          </div>
        </div>

        {/* Community cards */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-16 flex gap-2">
          {[1, 2, 3, 4, 5].map((card) => (
            <div
              key={card}
              className="w-14 h-20 bg-white rounded-lg shadow-lg animate-card-deal"
              style={{ animationDelay: `${card * 0.1}s` }}
            />
          ))}
        </div>

        {/* Player spots */}
        {players.map((player) => (
          <PlayerSpot key={player.id} player={player} />
        ))}
      </div>

      {/* Player controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
        <Button variant="destructive">Fold</Button>
        <Button variant="outline" className="bg-poker-accent text-black hover:bg-poker-accent/90">
          Call
        </Button>
        <Button className="bg-poker-accent text-black hover:bg-poker-accent/90">
          Raise
        </Button>
      </div>
    </div>
  );
};

export default PokerTable;