import { useEffect } from 'react';
import { GameContext } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';

interface GameSubscriptionsProps {
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>;
}

const GameSubscriptions: React.FC<GameSubscriptionsProps> = ({ setGameContext }) => {
  useEffect(() => {
    const channel = supabase.channel('game-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games' },
        (payload) => {
          console.log('Game updated:', payload);
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
        { event: 'UPDATE', schema: 'public', table: 'game_players' },
        (payload) => {
          console.log('Player updated:', payload);
          const updatedPlayer = payload.new;
          setGameContext(prev => ({
            ...prev,
            players: prev.players.map(p => 
              p.id === updatedPlayer.id 
                ? {
                    ...p,
                    chips: updatedPlayer.chips,
                    cards: updatedPlayer.cards,
                    isActive: updatedPlayer.is_active,
                    currentBet: updatedPlayer.current_bet,
                    isTurn: updatedPlayer.is_turn,
                  }
                : p
            ),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setGameContext]);

  return null;
};

export default GameSubscriptions;