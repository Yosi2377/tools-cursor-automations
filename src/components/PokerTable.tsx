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
    <div className="relative w-full h-screen bg-poker-background p-4 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]" />
      
      <div className="absolute inset-8 bg-poker-table rounded-full border-8 border-poker-accent/20 shadow-2xl">
        {/* Table felt texture */}
        <div className="absolute inset-0 rounded-full opacity-30 mix-blend-overlay"
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
               backgroundRepeat: 'repeat'
             }} />

        {/* Center pot display */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm px-6 py-3 rounded-full border border-poker-accent/30">
          <div className="flex items-center gap-2 text-poker-accent">
            <DollarSign className="w-5 h-5" />
            <span className="font-bold text-xl">1,200</span>
          </div>
        </div>

        {/* Community cards */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-16 flex gap-3">
          {[1, 2, 3, 4, 5].map((card) => (
            <div
              key={card}
              className="w-16 h-24 bg-white rounded-lg shadow-xl animate-card-deal transform hover:scale-105 transition-transform"
              style={{ 
                animationDelay: `${card * 0.1}s`,
                backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
              }}
            />
          ))}
        </div>

        {/* Player spots */}
        {players.map((player) => (
          <PlayerSpot key={player.id} player={player} />
        ))}
      </div>

      {/* Player controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
        <Button 
          variant="destructive" 
          className="px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          Fold
        </Button>
        <Button 
          variant="outline" 
          className="bg-poker-accent text-black hover:bg-poker-accent/90 px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          Call
        </Button>
        <Button 
          className="bg-poker-accent text-black hover:bg-poker-accent/90 px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          Raise
        </Button>
      </div>
    </div>
  );
};

export default PokerTable;