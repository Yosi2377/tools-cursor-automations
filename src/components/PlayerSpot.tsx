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

        // Check if user is already seated at another position
        const { data: existingPlayer } = await supabase
          .from('game_players')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (existingPlayer) {
          toast.error('You are already seated at another position');
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
    if (!player.isActive) {
      switch (player.position) {
        case 'bottom':
          return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-[50%]';
        case 'bottomLeft':
          return 'bottom-8 left-8 -translate-x-1/2 translate-y-1/2';
        case 'left':
          return 'left-0 top-1/2 -translate-y-1/2 -translate-x-[50%]';
        case 'topLeft':
          return 'top-8 left-8 -translate-x-1/2 -translate-y-1/2';
        case 'top':
          return 'top-0 left-1/2 -translate-x-1/2 -translate-y-[50%]';
        case 'topRight':
          return 'top-8 right-8 translate-x-1/2 -translate-y-1/2';
        case 'right':
          return 'right-0 top-1/2 -translate-y-1/2 translate-x-[50%]';
        case 'bottomRight':
          return 'bottom-8 right-8 translate-x-1/2 translate-y-1/2';
        default:
          return '';
      }
    }

    // Position active players in a perfect oval around the table
    const zIndex = player.position === 'bottom' ? 'z-50' : 'z-10';
    switch (player.position) {
      case 'bottom':
        return `bottom-4 left-1/2 -translate-x-1/2 ${zIndex}`;
      case 'bottomLeft':
        return `${isMobile ? 'left-12 bottom-16' : 'left-24 bottom-20'} -translate-x-1/2 ${zIndex}`;
      case 'left':
        return `${isMobile ? 'left-4' : 'left-8'} top-1/2 -translate-y-1/2 ${zIndex}`;
      case 'topLeft':
        return `${isMobile ? 'left-12 top-16' : 'left-24 top-20'} -translate-x-1/2 ${zIndex}`;
      case 'top':
        return `top-4 left-1/2 -translate-x-1/2 ${zIndex}`;
      case 'topRight':
        return `${isMobile ? 'right-12 top-16' : 'right-24 top-20'} translate-x-1/2 ${zIndex}`;
      case 'right':
        return `${isMobile ? 'right-4' : 'right-8'} top-1/2 -translate-y-1/2 ${zIndex}`;
      case 'bottomRight':
        return `${isMobile ? 'right-12 bottom-16' : 'right-24 bottom-20'} translate-x-1/2 ${zIndex}`;
      default:
        return '';
    }
  };

  const getCardPositionClasses = () => {
    if (player.position === 'bottom') {
      return 'top-full mt-2';
    }
    return 'top-0 -translate-y-full';
  };

  const shouldShowFaceUp = player.position === 'bottom';
  const inactiveStyles = !player.isActive ? 'opacity-100 hover:opacity-80 cursor-pointer' : '';

  return (
    <div 
      className={`absolute ${getPositionClasses()} flex flex-col items-center gap-2 transition-all duration-500 ${inactiveStyles}`}
      onClick={!player.isActive ? handleSeatClick : undefined}
    >
      {!player.isActive ? (
        <div className="w-12 h-12 rounded-full bg-poker-background border-2 border-white/20 flex flex-col items-center justify-center text-white/50 hover:text-white/80 transition-colors">
          <span className="text-xs">Empty</span>
          <span className="text-[10px]">Seat</span>
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
              shouldShowFaceUp={shouldShowFaceUp}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerSpot;