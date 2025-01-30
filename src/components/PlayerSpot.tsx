import React from 'react';
import { Player } from '@/types/poker';
import PlayerCard from './poker/PlayerCard';
import PlayerInfo from './poker/PlayerInfo';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bot, User } from 'lucide-react';

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

        // Update the player's position in the game
        const { error: updateError } = await supabase
          .from('game_players')
          .update({
            is_active: true,
            user_id: user.id,
            chips: 1000,
            cards: [],
            current_bet: 0,
            is_turn: false
          })
          .eq('position', positionIndex.toString());

        if (updateError) {
          console.error('Error joining game:', updateError);
          toast.error('Failed to join the game');
          return;
        }

        toast.success('Successfully joined the game');
      } catch (error) {
        console.error('Error joining game:', error);
        toast.error('Failed to join the game');
      }
    }
  };

  const getPositionClasses = () => {
    const baseClasses = 'absolute transition-all duration-500';
    
    const positionClasses = {
      bottom: `${baseClasses} bottom-24 left-1/2 -translate-x-1/2`,
      bottomLeft: `${baseClasses} bottom-32 left-32 -translate-x-1/2`,
      left: `${baseClasses} left-24 top-1/2 -translate-y-1/2`,
      topLeft: `${baseClasses} top-32 left-32 -translate-x-1/2`,
      top: `${baseClasses} top-24 left-1/2 -translate-x-1/2`,
      topRight: `${baseClasses} top-32 right-32 translate-x-1/2`,
      right: `${baseClasses} right-24 top-1/2 -translate-y-1/2`,
      bottomRight: `${baseClasses} bottom-32 right-32 translate-x-1/2`
    };

    if (!player.isActive) {
      return positionClasses[player.position as keyof typeof positionClasses] || baseClasses;
    }

    const zIndex = player.position === 'bottom' ? 'z-50' : 'z-10';
    const mobileClasses = {
      bottom: `${baseClasses} bottom-20 left-1/2 -translate-x-1/2 ${zIndex}`,
      bottomLeft: `${baseClasses} ${isMobile ? 'left-24 bottom-32' : 'left-64 bottom-48'} -translate-x-1/2 ${zIndex}`,
      left: `${baseClasses} ${isMobile ? 'left-16' : 'left-24'} top-1/2 -translate-y-1/2 ${zIndex}`,
      topLeft: `${baseClasses} ${isMobile ? 'left-24 top-32' : 'left-64 top-48'} -translate-x-1/2 ${zIndex}`,
      top: `${baseClasses} top-20 left-1/2 -translate-x-1/2 ${zIndex}`,
      topRight: `${baseClasses} ${isMobile ? 'right-24 top-32' : 'right-64 top-48'} translate-x-1/2 ${zIndex}`,
      right: `${baseClasses} ${isMobile ? 'right-16' : 'right-24'} top-1/2 -translate-y-1/2 ${zIndex}`,
      bottomRight: `${baseClasses} ${isMobile ? 'right-24 bottom-32' : 'right-64 bottom-48'} translate-x-1/2 ${zIndex}`
    };

    return mobileClasses[player.position as keyof typeof mobileClasses] || baseClasses;
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
      
      {player.cards && player.cards.length > 0 && (
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