import { useEffect } from 'react';
import { GameContext } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';

interface GameSubscriptionsProps {
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>;
}

const GameSubscriptions: React.FC<GameSubscriptionsProps> = ({ setGameContext }) => {
  useEffect(() => {
    console.log('Setting up game subscriptions...');
    
    const channel = supabase.channel('game-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games' },
        (payload) => {
          console.log('Game updated:', payload);
          if (payload.eventType === 'DELETE') return;
          
          const newGameState = payload.new;
          setGameContext(prev => ({
            ...prev,
            pot: newGameState.pot,
            rake: newGameState.rake,
            communityCards: newGameState.community_cards,
            currentPlayer: newGameState.current_player_index,
            gameState: newGameState.status,
            currentBet: newGameState.current_bet,
            dealerPosition: newGameState.dealer_position,
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players' },
        (payload) => {
          console.log('Player updated:', payload);
          if (payload.eventType === 'DELETE') return;

          const updatedPlayer = payload.new;
          setGameContext(prev => ({
            ...prev,
            players: prev.players.map(p => 
              p.position === updatedPlayer.position
                ? {
                    ...p,
                    id: updatedPlayer.id,
                    chips: updatedPlayer.chips,
                    cards: updatedPlayer.cards,
                    isActive: updatedPlayer.is_active,
                    currentBet: updatedPlayer.current_bet,
                    isTurn: updatedPlayer.is_turn,
                    name: updatedPlayer.user_id ? 'Player ' + updatedPlayer.id.slice(0, 4) : p.name,
                  }
                : p
            ),
          }));
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up game subscriptions...');
      supabase.removeChannel(channel);
    };
  }, [setGameContext]);

  return null;
};

export default GameSubscriptions;