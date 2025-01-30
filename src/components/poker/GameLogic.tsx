import { GameContext, Player } from '@/types/poker';
import { toast } from 'sonner';
import { dealCards } from '@/utils/pokerLogic';
import { supabase } from '@/integrations/supabase/client';

export const useGameLogic = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
) => {
  const startNewHand = async () => {
    try {
      const currentDealerIndex = gameContext.dealerPosition;
      const nextDealerIndex = (currentDealerIndex + 1) % gameContext.players.length;
      const activePlayers = gameContext.players.filter(p => p.isActive);
      
      if (activePlayers.length < 1) {
        toast.error("Need at least 1 player to start a hand");
        return;
      }
      
      const { updatedPlayers, remainingDeck } = dealCards(gameContext.players);
      const firstPlayerIndex = (nextDealerIndex + 1) % gameContext.players.length;
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      console.log('Starting new hand with players:', updatedPlayers);

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
        .eq('id', gameContext.gameId);

      if (gameError) throw gameError;

      // Update players in Supabase
      const playerUpdates = updatedPlayers.map((p, index) => ({
        game_id: gameContext.gameId,
        position: index.toString(),
        cards: JSON.stringify(p.cards),
        is_turn: index === firstPlayerIndex,
        is_active: p.isActive,
        current_bet: 0,
        user_id: p.name.startsWith('Bot') ? `bot-${index}` : user.id
      }));

      const { error: playersError } = await supabase
        .from('game_players')
        .upsert(playerUpdates);

      if (playersError) throw playersError;

      setGameContext(prev => ({
        ...prev,
        players: updatedPlayers.map((p, i) => ({ 
          ...p,
          isTurn: i === firstPlayerIndex,
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

      toast.success("New hand started - cards dealt!");

    } catch (error) {
      console.error('Error starting new hand:', error);
      toast.error("Failed to start new hand");
    }
  };

  return {
    startNewHand
  };
};