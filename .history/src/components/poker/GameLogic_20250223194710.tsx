import { GameContext, Player, Card } from '@/types/poker';
import { toast } from 'sonner';
import { dealCards } from '@/utils/pokerLogic';
import { supabase } from '@/integrations/supabase/client';
import { useCardDealing } from './CardDealing';
import { PostgrestError } from '@supabase/supabase-js';

const TIMEOUT_DURATION = 15000; // 15 seconds timeout for player actions
const FORCE_PROGRESS_DURATION = 30000; // 30 seconds to force game progression
const FORCE_ACTION_DURATION = 15000; // 15 seconds to force action for inactive players

type Position = 'bottom' | 'bottomRight' | 'right' | 'topRight' | 'top' | 'topLeft' | 'left' | 'bottomLeft';

const positions: Position[] = [
  'bottom', 'bottomRight', 'right', 'topRight',
  'top', 'topLeft', 'left', 'bottomLeft'
];

type BetHandler = (amount: number) => Promise<void>;
type FoldHandler = () => Promise<void>;

export const useGameLogic = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
) => {
  const { dealCommunityCards } = useCardDealing();

  const startNewHand = async (): Promise<void> => {
    const currentDealerIndex = gameContext.dealerPosition;
    const nextDealerIndex = (currentDealerIndex + 1) % gameContext.players.length;
    
    const { updatedPlayers } = dealCards(gameContext.players);
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

      if (gameCreateError) throw gameCreateError as Error;
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

    } catch (error: unknown) {
      if (error instanceof PostgrestError) {
        console.error('Database error starting new hand:', error.message);
      } else if (error instanceof Error) {
        console.error('Error starting new hand:', error.message);
      } else {
        console.error('Unknown error starting new hand:', error);
      }
      toast.error("Failed to start new hand");
    }
  };

  const dealNextCommunityCards = async (): Promise<void> => {
    if (!gameContext.gameId) {
      console.error('No game ID found in context');
      return;
    }

    // Check if all players have acted
    const allPlayersActed = gameContext.players.every(player => 
      !player.isActive || player.currentBet === gameContext.currentBet
    );

    console.log('Before dealing community cards:', { allPlayersActed, currentBet: gameContext.currentBet, communityCards: gameContext.communityCards });

    if (!allPlayersActed) {
      console.error('Not all players have acted yet');
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

    console.log('Dealing community cards:', { currentCount, newCards });

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
      } catch (error: unknown) {
        if (error instanceof PostgrestError) {
          console.error('Database error dealing community cards:', error.message);
        } else if (error instanceof Error) {
          console.error('Error dealing community cards:', error.message);
        } else {
          console.error('Unknown error dealing community cards:', error);
        }
        toast.error('Failed to deal community cards');
      }
    }
  };

  const handlePlayerTimeout = async (player: Player): Promise<void> => {
    try {
      console.log(`${player.name} has timed out. Automatically folding.`);
      await handleFold(player);
      checkGameState();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error handling player timeout:', error.message);
      }
    }
  };

  const forceGameProgression = async (): Promise<void> => {
    try {
      console.log('Forcing game progression due to inactivity.');
      await dealNextCommunityCards();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error forcing game progression:', error.message);
      }
    }
  };

  const forcePlayerAction = async (player: Player): Promise<void> => {
    try {
      console.log(`${player.name} is inactive. Automatically folding.`);
      await handleFold(player);
      checkGameState();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error forcing player action:', error.message);
      }
    }
  };

  const checkGameState = (): void => {
    try {
      const allPlayersActed = gameContext.players.every((player: Player) => 
        !player.isActive || player.currentBet === gameContext.currentBet
      );

      const totalPot = gameContext.players.reduce((sum, player) => sum + (player.currentBet || 0), 0);

      console.log('Game state check:', {
        allPlayersActed,
        activePlayers: gameContext.players.filter(p => p.isActive).length,
        currentBet: gameContext.currentBet,
        totalPot,
        playerBets: gameContext.players.map(p => ({
          name: p.name,
          bet: p.currentBet,
          isActive: p.isActive
        }))
      });

      if (allPlayersActed) {
        console.log('All players have acted, dealing next community cards');
        void dealNextCommunityCards();
      } else {
        console.log('Not all players have acted yet, waiting for actions.');
        gameContext.players.forEach(player => {
          if (player.isActive && player.currentBet !== gameContext.currentBet) {
            void forcePlayerAction(player);
          }
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error checking game state:', error.message);
      }
    }
  };

  const handleOpponentAction = async (
    player: Player,
    gameContext: GameContext,
    handleBet: BetHandler,
    handleFold: FoldHandler
  ): Promise<void> => {
    const timeoutId = setTimeout(() => handlePlayerTimeout(player), TIMEOUT_DURATION);

    try {
      // Simple bot logic - randomly choose between betting and folding
      const randomAction = Math.random();
      const minBet = gameContext.minimumBet;
      const currentBet = gameContext.currentBet;
      const callAmount = currentBet - player.currentBet;

      // Bot decision making
      if (randomAction < 0.1) {
        // 10% chance to fold
        await handleFold();
      } else if (randomAction < 0.3) {
        // 20% chance to raise
        const raiseAmount = callAmount + minBet;
        await handleBet(raiseAmount);
      } else {
        // 70% chance to call
        await handleBet(callAmount);
      }
    } catch (error: unknown) {
      if (error instanceof PostgrestError) {
        console.error('Database error in bot action:', error.message);
      } else if (error instanceof Error) {
        console.error('Error in bot action:', error.message);
      } else {
        console.error('Unknown error in bot action:', error);
      }
      toast.error(`${player.name} encountered an error. Folding.`);
      await handleFold();
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleFold = async (player: Player): Promise<void> => {
    if (!gameContext.gameId) {
      console.error('No game ID found in context');
      return;
    }

    try {
      console.log(`${player.name} has folded.`);

      const { error: playerError } = await supabase
        .from('game_players')
        .update({
          is_active: false,
          is_turn: false
        })
        .eq('game_id', gameContext.gameId)
        .eq('position', player.position);

      if (playerError) throw playerError;

      setGameContext(prev => {
        const updatedPlayers = prev.players.map(p => 
          p.id === player.id ? { ...p, isActive: false, isTurn: false } : p
        );
        return { ...prev, players: updatedPlayers };
      });

      toast.success(`${player.name} folded`);
    } catch (error: unknown) {
      if (error instanceof PostgrestError) {
        console.error('Database error handling fold:', error.message);
      } else if (error instanceof Error) {
        console.error('Error handling fold:', error.message);
      } else {
        console.error('Unknown error handling fold:', error);
      }
      toast.error('Failed to process fold action');
    }
  };

  return {
    startNewHand,
    dealNextCommunityCards,
    handleFold,
    handleOpponentAction
  };
};

const getPositionForIndex = (index: number, totalPlayers: number) => {
  return positions[index % positions.length] as Position;
};