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

        // Convert position to a number between 0-7
        const positions = ['bottom', 'bottomRight', 'right', 'topRight', 'top', 'topLeft', 'left', 'bottomLeft'];
        const positionIndex = positions.indexOf(player.position);
        
        if (positionIndex === -1) {
          toast.error('Invalid position');
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
          return `${baseClasses} bottom-8 left-1/2 -translate-x-1/2`;
        case 'bottomLeft':
          return `${baseClasses} bottom-16 left-16 -translate-x-1/2`;
        case 'left':
          return `${baseClasses} left-8 top-1/2 -translate-y-1/2`;
        case 'topLeft':
          return `${baseClasses} top-16 left-16 -translate-x-1/2`;
        case 'top':
          return `${baseClasses} top-8 left-1/2 -translate-x-1/2`;
        case 'topRight':
          return `${baseClasses} top-16 right-16 translate-x-1/2`;
        case 'right':
          return `${baseClasses} right-8 top-1/2 -translate-y-1/2`;
        case 'bottomRight':
          return `${baseClasses} bottom-16 right-16 translate-x-1/2`;
        default:
          return baseClasses;
      }
    }

    // Position active players in a perfect oval
    const zIndex = player.position === 'bottom' ? 'z-50' : 'z-10';
    switch (player.position) {
      case 'bottom':
        return `${baseClasses} bottom-4 left-1/2 -translate-x-1/2 ${zIndex}`;
      case 'bottomLeft':
        return `${baseClasses} ${isMobile ? 'left-12 bottom-16' : 'left-32 bottom-24'} -translate-x-1/2 ${zIndex}`;
      case 'left':
        return `${baseClasses} ${isMobile ? 'left-4' : 'left-8'} top-1/2 -translate-y-1/2 ${zIndex}`;
      case 'topLeft':
        return `${baseClasses} ${isMobile ? 'left-12 top-16' : 'left-32 top-24'} -translate-x-1/2 ${zIndex}`;
      case 'top':
        return `${baseClasses} top-4 left-1/2 -translate-x-1/2 ${zIndex}`;
      case 'topRight':
        return `${baseClasses} ${isMobile ? 'right-12 top-16' : 'right-32 top-24'} translate-x-1/2 ${zIndex}`;
      case 'right':
        return `${baseClasses} ${isMobile ? 'right-4' : 'right-8'} top-1/2 -translate-y-1/2 ${zIndex}`;
      case 'bottomRight':
        return `${baseClasses} ${isMobile ? 'right-12 bottom-16' : 'right-32 bottom-24'} translate-x-1/2 ${zIndex}`;
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

  const shouldShowFaceUp = player.position === 'bottom';
  const inactiveStyles = !player.isActive ? 'opacity-100 hover:opacity-80 cursor-pointer' : '';
  const isBot = player.name.startsWith('Bot');

  return (
    <div 
      className={`${getPositionClasses()} flex flex-col items-center gap-2 ${inactiveStyles}`}
      onClick={!player.isActive ? handleSeatClick : undefined}
    >
      {!player.isActive ? (
        <div className="w-16 h-16 rounded-full bg-poker-accent/10 border-2 border-poker-accent/20 flex flex-col items-center justify-center text-poker-accent hover:bg-poker-accent/20 hover:border-poker-accent/40 transition-all">
          <span>Empty</span>
          <span className="text-xs">Click to join</span>
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