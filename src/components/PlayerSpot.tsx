import React from 'react';
import { Player } from '@/types/poker';
import PlayerCard from './poker/PlayerCard';
import PlayerInfo from './poker/PlayerInfo';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlayerSpotProps {
  player: Player;
  onTimeout?: () => void;
}

const PlayerSpot: React.FC<PlayerSpotProps> = ({ player, onTimeout }) => {
  const isMobile = useIsMobile();

  const handleSeatClick = async () => {
    if (!player.isActive) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please login to join the game');
          return;
        }

        const { error } = await supabase
          .from('game_players')
          .update({
            is_active: true,
            user_id: user.id,
          })
          .eq('position', player.position);

        if (error) throw error;
        toast.success('Successfully joined the game');
      } catch (error) {
        console.error('Error joining game:', error);
        toast.error('Failed to join the game');
      }
    }
  };

  const getPositionClasses = () => {
    const baseClasses = 'absolute transition-all duration-500';
    const activeClasses = player.isActive ? 'z-10' : 'opacity-70 hover:opacity-100 cursor-pointer';
    
    switch (player.position) {
      case 'bottom':
        return `${baseClasses} ${activeClasses} bottom-8 left-1/2 -translate-x-1/2`;
      case 'bottomLeft':
        return `${baseClasses} ${activeClasses} bottom-24 left-24 -translate-x-1/2`;
      case 'left':
        return `${baseClasses} ${activeClasses} left-12 top-1/2 -translate-y-1/2`;
      case 'topLeft':
        return `${baseClasses} ${activeClasses} top-24 left-24 -translate-x-1/2`;
      case 'top':
        return `${baseClasses} ${activeClasses} top-8 left-1/2 -translate-x-1/2`;
      case 'topRight':
        return `${baseClasses} ${activeClasses} top-24 right-24 translate-x-1/2`;
      case 'right':
        return `${baseClasses} ${activeClasses} right-12 top-1/2 -translate-y-1/2`;
      case 'bottomRight':
        return `${baseClasses} ${activeClasses} bottom-24 right-24 translate-x-1/2`;
      default:
        return baseClasses;
    }
  };

  const getCardPositionClasses = () => {
    const baseClasses = 'absolute left-1/2 transform -translate-x-1/2';
    
    switch (player.position) {
      case 'bottom':
        return `${baseClasses} top-full mt-4`;
      case 'bottomLeft':
      case 'bottomRight':
        return `${baseClasses} top-full mt-2`;
      case 'top':
        return `${baseClasses} bottom-full mb-4`;
      case 'topLeft':
      case 'topRight':
        return `${baseClasses} bottom-full mb-2`;
      case 'left':
      case 'right':
        return `${baseClasses} top-0 -translate-y-full`;
      default:
        return `${baseClasses} top-0 -translate-y-full`;
    }
  };

  return (
    <div 
      className={getPositionClasses()}
      onClick={!player.isActive ? handleSeatClick : undefined}
    >
      {!player.isActive ? (
        <div className="w-12 h-12 rounded-full bg-black/40 border border-white/20 flex flex-col items-center justify-center text-white/50 hover:text-white/80 transition-colors">
          <span className="text-xs">Empty</span>
          <span className="text-[10px]">Click to join</span>
        </div>
      ) : (
        <PlayerInfo player={player} onTimeout={onTimeout} />
      )}
      
      {player.cards.length > 0 && (
        <div className={`absolute left-1/2 transform -translate-x-1/2 mt-2 flex gap-1 ${getCardPositionClasses()}`}>
          {player.cards.map((card, index) => (
            <PlayerCard
              key={index}
              card={card}
              index={index}
              shouldShowFaceUp={player.position === 'bottom'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerSpot;