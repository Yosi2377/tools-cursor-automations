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
        return `${baseClasses} ${activeClasses} bottom-2 sm:bottom-3 md:bottom-4 left-1/2 -translate-x-1/2`;
      case 'bottomLeft':
        return `${baseClasses} ${activeClasses} bottom-12 sm:bottom-14 md:bottom-16 left-12 sm:left-14 md:left-16 -translate-x-1/2`;
      case 'left':
        return `${baseClasses} ${activeClasses} left-6 sm:left-7 md:left-8 top-1/2 -translate-y-1/2`;
      case 'topLeft':
        return `${baseClasses} ${activeClasses} top-12 sm:top-14 md:top-16 left-12 sm:left-14 md:left-16 -translate-x-1/2`;
      case 'top':
        return `${baseClasses} ${activeClasses} top-2 sm:top-3 md:top-4 left-1/2 -translate-x-1/2`;
      case 'topRight':
        return `${baseClasses} ${activeClasses} top-12 sm:top-14 md:top-16 right-12 sm:right-14 md:right-16 translate-x-1/2`;
      case 'right':
        return `${baseClasses} ${activeClasses} right-6 sm:right-7 md:right-8 top-1/2 -translate-y-1/2`;
      case 'bottomRight':
        return `${baseClasses} ${activeClasses} bottom-12 sm:bottom-14 md:bottom-16 right-12 sm:right-14 md:right-16 translate-x-1/2`;
      default:
        return baseClasses;
    }
  };

  const getCardPositionClasses = () => {
    if (player.position === 'bottom') {
      return 'top-full mt-2';
    }
    return 'top-0 -translate-y-full';
  };

  return (
    <div 
      className={getPositionClasses()}
      onClick={!player.isActive ? handleSeatClick : undefined}
    >
      {!player.isActive ? (
        <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full bg-black/40 border border-white/20 flex flex-col items-center justify-center text-white/50 hover:text-white/80 transition-colors">
          <span className="text-[10px] sm:text-xs">Empty</span>
          <span className="text-[8px] sm:text-[10px]">Click to join</span>
        </div>
      ) : (
        <PlayerInfo player={player} onTimeout={onTimeout} />
      )}
      
      {player.cards.length > 0 && (
        <div className={`absolute left-1/2 transform -translate-x-1/2 mt-1 sm:mt-1.5 md:mt-2 flex gap-0.5 sm:gap-1 ${getCardPositionClasses()}`}>
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