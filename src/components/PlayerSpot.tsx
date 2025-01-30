import React from 'react';
import { Player } from '@/types/poker';
import PlayerCard from './poker/PlayerCard';
import PlayerInfo from './poker/PlayerInfo';
import { useIsMobile } from '@/hooks/use-mobile';
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

        const positions = ['bottom', 'bottomRight', 'right', 'topRight', 'top', 'topLeft', 'left', 'bottomLeft'];
        const positionIndex = positions.indexOf(player.position);
        
        if (positionIndex === -1) {
          toast.error('Invalid position');
          return;
        }

        // Check if the user is already seated at another position
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

        // Check if the seat is truly available
        const { data: currentSeat } = await supabase
          .from('game_players')
          .select('*')
          .eq('position', positionIndex.toString())
          .eq('is_active', true)
          .single();

        if (currentSeat) {
          toast.error('This seat is no longer available');
          return;
        }

        const { error } = await supabase
          .from('game_players')
          .update({
            is_active: true,
            user_id: user.id,
          })
          .eq('position', positionIndex.toString());

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
    
    if (!player.isActive) {
      switch (player.position) {
        case 'bottom':
          return `${baseClasses} bottom-24 left-1/2 -translate-x-1/2`;
        case 'bottomLeft':
          return `${baseClasses} bottom-32 left-32 -translate-x-1/2`;
        case 'left':
          return `${baseClasses} left-24 top-1/2 -translate-y-1/2`;
        case 'topLeft':
          return `${baseClasses} top-32 left-32 -translate-x-1/2`;
        case 'top':
          return `${baseClasses} top-24 left-1/2 -translate-x-1/2`;
        case 'topRight':
          return `${baseClasses} top-32 right-32 translate-x-1/2`;
        case 'right':
          return `${baseClasses} right-24 top-1/2 -translate-y-1/2`;
        case 'bottomRight':
          return `${baseClasses} bottom-32 right-32 translate-x-1/2`;
        default:
          return baseClasses;
      }
    }

    const zIndex = player.position === 'bottom' ? 'z-50' : 'z-10';
    switch (player.position) {
      case 'bottom':
        return `${baseClasses} bottom-20 left-1/2 -translate-x-1/2 ${zIndex}`;
      case 'bottomLeft':
        return `${baseClasses} ${isMobile ? 'left-24 bottom-32' : 'left-64 bottom-48'} -translate-x-1/2 ${zIndex}`;
      case 'left':
        return `${baseClasses} ${isMobile ? 'left-16' : 'left-24'} top-1/2 -translate-y-1/2 ${zIndex}`;
      case 'topLeft':
        return `${baseClasses} ${isMobile ? 'left-24 top-32' : 'left-64 top-48'} -translate-x-1/2 ${zIndex}`;
      case 'top':
        return `${baseClasses} top-20 left-1/2 -translate-x-1/2 ${zIndex}`;
      case 'topRight':
        return `${baseClasses} ${isMobile ? 'right-24 top-32' : 'right-64 top-48'} translate-x-1/2 ${zIndex}`;
      case 'right':
        return `${baseClasses} ${isMobile ? 'right-16' : 'right-24'} top-1/2 -translate-y-1/2 ${zIndex}`;
      case 'bottomRight':
        return `${baseClasses} ${isMobile ? 'right-24 bottom-32' : 'right-64 bottom-48'} translate-x-1/2 ${zIndex}`;
      default:
        return baseClasses;
    }
  };

  const getCardPositionClasses = () => {
    if (player.position === 'bottom') {
      return 'top-full mt-4';
    }
    return 'top-0 -translate-y-full -mt-4';
  };

  const shouldShowFaceUp = player.position === 'bottom';
  const inactiveStyles = !player.isActive ? 'opacity-100 hover:opacity-80 cursor-pointer' : '';
  const isBot = player.name.startsWith('Bot');

  return (
    <div 
      className={`${getPositionClasses()} flex flex-col items-center gap-4 ${inactiveStyles}`}
      onClick={!player.isActive ? handleSeatClick : undefined}
    >
      {!player.isActive ? (
        <div className="w-40 h-40 rounded-full bg-poker-accent/30 border-4 border-poker-accent/60 flex flex-col items-center justify-center text-poker-accent hover:bg-poker-accent/40 hover:border-poker-accent/80 transition-all shadow-xl animate-pulse ring-4 ring-white/20">
          <span className="text-lg font-semibold">Empty Seat</span>
          <span className="text-sm mt-1">Click to join</span>
        </div>
      ) : (
        <PlayerInfo 
          player={{
            ...player,
            name: isBot ? `Bot ${player.id}` : player.name
          }} 
          onTimeout={onTimeout}
        />
      )}
      
      {player.cards.length > 0 && (
        <div className={`absolute left-1/2 transform -translate-x-1/2 mt-2 flex gap-2 ${getCardPositionClasses()}`}>
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