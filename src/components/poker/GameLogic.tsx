import { GameContext, Player, Card } from '@/types/poker';
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

      // Create new game first
      const { data: newGame, error: gameCreateError } = await supabase
        .from('games')
        .insert({
          status: 'betting',
          current_player_index: firstPlayerIndex,
          community_cards: [],
          pot: 0,
          rake: 0,
          current_bet: gameContext.minimumBet,
          dealer_position: nextDealerIndex,
          room_id: gameContext.roomId
        })
        .select()
        .single();

      if (gameCreateError) throw gameCreateError;
      if (!newGame) throw new Error('Failed to create new game');

      // Update players in Supabase
      const { error: playersError } = await supabase
        .from('game_players')
        .upsert(
          updatedPlayers.map((p, index) => ({
            game_id: newGame.id,
            user_id: user.id,
            position: getPositionForIndex(index, updatedPlayers.length),
            cards: JSON.stringify(p.cards),
            is_turn: index === firstPlayerIndex,
            is_active: true,
            current_bet: 0,
            chips: p.chips
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
        dealerPosition: nextDealerIndex,
        gameId: newGame.id
      }));

      toast.success("New hand started");

    } catch (error) {
      console.error('Error starting new hand:', error);
      toast.error("Failed to start new hand");
    }
  };

  const dealNextCommunityCards = async () => {
    if (!gameContext.gameId) {
      console.error('No game ID found in context');
      return;
    }

    const currentCount = gameContext.communityCards.length;
    let newCards: Card[] = [];
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
            community_cards: JSON.stringify([...gameContext.communityCards, ...newCards]),
            current_bet: 0,
            current_player_index: (gameContext.dealerPosition + 1) % gameContext.players.length
          })
          .eq('id', gameContext.gameId);

        if (updateError) throw updateError;

        // Reset player bets
        const { error: playersError } = await supabase
          .from('game_players')
          .update({ current_bet: 0 })
          .eq('game_id', gameContext.gameId);

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