import { GameContext, Player } from '@/types/poker';
import { toast } from 'sonner';
import { dealCards } from '@/utils/pokerLogic';
import { supabase } from '@/integrations/supabase/client';
import { useCardDealing } from './CardDealing';

export const useGameLogic = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
) => {
  const { dealCommunityCards } = useCardDealing();

  const startNewHand = async () => {
    const currentDealerIndex = gameContext.dealerPosition;
    const nextDealerIndex = (currentDealerIndex + 1) % gameContext.players.length;
    
    const { updatedPlayers, remainingDeck } = dealCards(gameContext.players);
    const firstPlayerIndex = (nextDealerIndex + 1) % gameContext.players.length;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

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
          updatedPlayers.map(p => ({
            user_id: user.id,
            cards: p.cards,
            is_turn: p.position === getPositionForIndex(firstPlayerIndex, updatedPlayers.length),
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

      toast.success("New hand started");

    } catch (error) {
      console.error('Error starting new hand:', error);
      toast.error("Failed to start new hand");
    }
  };

  const dealNextCommunityCards = async () => {
    const currentCount = gameContext.communityCards.length;
    let newCards = [];
    let stage = '';

    if (currentCount === 0) {
      newCards = dealCommunityCards(3); // Flop
      stage = 'Flop';
    } else if (currentCount === 3) {
      newCards = dealCommunityCards(1); // Turn
      stage = 'Turn';
    } else if (currentCount === 4) {
      newCards = dealCommunityCards(1); // River
      stage = 'River';
    }

    if (newCards.length > 0) {
      try {
        const { error: updateError } = await supabase
          .from('games')
          .update({
            community_cards: [...gameContext.communityCards, ...newCards],
            current_bet: 0,
            current_player_index: (gameContext.dealerPosition + 1) % gameContext.players.length
          })
          .eq('status', 'betting');

        if (updateError) throw updateError;

        // Reset player bets
        const { error: playersError } = await supabase
          .from('game_players')
          .update({ current_bet: 0 })
          .eq('game_id', gameContext.currentGameId);

        if (playersError) throw playersError;

        setGameContext(prev => ({
          ...prev,
          communityCards: [...prev.communityCards, ...newCards],
          currentBet: 0,
          players: prev.players.map(p => ({ ...p, currentBet: 0 })),
          currentPlayer: (prev.dealerPosition + 1) % prev.players.length
        }));

        toast.success(`${stage} dealt!`);
      } catch (error) {
        console.error('Error dealing community cards:', error);
        toast.error('Failed to deal community cards');
      }
    }
  };

  return {
    startNewHand,
    dealNextCommunityCards
  };
};

const getPositionForIndex = (index: number, totalPlayers: number) => {
  const positions = [
    'bottom', 'bottomRight', 'right', 'topRight',
    'top', 'topLeft', 'left', 'bottomLeft'
  ];
  return positions[index % positions.length] as any;
};