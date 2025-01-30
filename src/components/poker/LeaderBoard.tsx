import React from 'react';
import { Player } from '@/types/poker';
import { Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface LeaderBoardProps {
  players: Player[];
  onClose: () => void;
}

const LeaderBoard: React.FC<LeaderBoardProps> = ({ players, onClose }) => {
  const isMobile = useIsMobile();
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  
  return (
    <div className={`absolute ${isMobile ? 'top-16 right-2 w-[calc(100%-1rem)]' : 'top-16 right-4 w-80'} bg-black/90 backdrop-blur-sm rounded-lg p-6 z-50 border border-poker-accent/30`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-poker-accent flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Leaderboard
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="space-y-3">
        {sortedPlayers.map((player, index) => (
          <div 
            key={player.id}
            className={`flex items-center justify-between p-3 rounded-lg ${
              index === 0 ? 'bg-yellow-500/20' : 'bg-black/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-poker-accent font-bold">{index + 1}</span>
              <span className="text-white">{player.name}</span>
            </div>
            <span className="text-poker-accent font-bold">{player.score || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaderBoard;