import { GameContext, Player } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';
import { dealCards } from '@/utils/pokerLogic';
import { supabase } from '@/integrations/supabase/client';

export const useGameLogic = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
) => {
  const startNewHand = async () => {
    const currentDealerIndex = gameContext.dealerPosition;
    const nextDealerIndex = (currentDealerIndex + 1) % gameContext.players.length;
    
    const { updatedPlayers, remainingDeck } = dealCards(gameContext.players);
    const firstPlayerIndex = (nextDealerIndex + 1) % gameContext.players.length;
    
    try {
      // Update game state in Supabase
      const { error: gameError } = await supabase
        .from('games')
        .update({
          status: 'betting',
          current_player_index: firstPlayerIndex,
          community_cards: [],
          pot: 0,
          rake: 0,
          current_bet: gameContext.minimumBet,
          dealer_position: nextDealerIndex
        })
        .eq('status', 'waiting');

      if (gameError) throw gameError;

      // Update players in Supabase
      const { error: playersError } = await supabase
        .from('game_players')
        .upsert(
          updatedPlayers.map((p, i) => ({
            cards: p.cards,
            is_turn: i === firstPlayerIndex,
            is_active: true,
            current_bet: 0
          }))
        );

      if (playersError) throw playersError;

      setGameContext(prev => ({
        ...prev,
        players: updatedPlayers.map((p, i) => ({ 
          ...p,
          isTurn: i === firstPlayerIndex,
          isActive: true,
          currentBet: 0
        })),
        gameState: "betting",
        currentPlayer: firstPlayerIndex,
        communityCards: [],
        pot: 0,
        rake: 0,
        currentBet: prev.minimumBet,
        dealerPosition: nextDealerIndex
      }));

      toast({
        title: "New hand started",
        description: "Cards have been dealt to all players",
      });
    } catch (error) {
      console.error('Error starting new hand:', error);
      toast({
        title: "Error",
        description: "Failed to start new hand",
        variant: "destructive"
      });
    }
  };

  return {
    startNewHand
  };
};