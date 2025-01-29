import { GameContext, Card, Suit, Rank } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';
import { placeBet, fold } from '@/utils/pokerLogic';

const RAKE_PERCENTAGE = 0.12; // 12% rake

export const useBettingLogic = (
  gameContext: GameContext,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>,
  dealCommunityCards: (count: number) => void
) => {
  const handleTimeout = () => {
    handleFold();
    toast({
      title: "Time's up!",
      description: `${gameContext.players[gameContext.currentPlayer].name} took too long and folded`,
      variant: "destructive",
    });
  };

  const calculateRake = (amount: number) => {
    return Math.floor(amount * RAKE_PERCENTAGE);
  };

  const handleBet = (amount: number) => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    
    if (currentPlayer.chips < amount) {
      toast({
        title: "Invalid bet",
        description: "You don't have enough chips",
        variant: "destructive",
      });
      return;
    }

    const rake = calculateRake(amount);
    const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
    const updatedContext = placeBet(gameContext, currentPlayer.id, amount);
    
    setGameContext(prev => ({
      ...updatedContext,
      currentPlayer: nextPlayerIndex,
      rake: (prev.rake || 0) + rake,
      pot: updatedContext.pot - rake,
      players: updatedContext.players.map((p, i) => ({
        ...p,
        isTurn: i === nextPlayerIndex && p.isActive
      }))
    }));

    toast({
      title: "Bet placed",
      description: `${currentPlayer.name} bet ${amount} chips (Rake: ${rake} chips)`,
    });

    // Check if all active players have matched the current bet
    const activePlayers = updatedContext.players.filter(p => p.isActive);
    const allPlayersActed = activePlayers.every(p => p.currentBet === updatedContext.currentBet);
    
    if (allPlayersActed && activePlayers.length > 1) {
      if (updatedContext.communityCards.length === 0) {
        dealCommunityCards(3); // Deal the flop
        toast({
          title: "Flop dealt",
          description: "Three community cards have been dealt",
        });
      } else if (updatedContext.communityCards.length === 3) {
        dealCommunityCards(1); // Deal the turn
        toast({
          title: "Turn dealt",
          description: "Fourth community card has been dealt",
        });
      } else if (updatedContext.communityCards.length === 4) {
        dealCommunityCards(1); // Deal the river
        toast({
          title: "River dealt",
          description: "Final community card has been dealt",
        });
      }

      // Reset player bets for the next betting round
      setGameContext(prev => ({
        ...prev,
        players: prev.players.map(p => ({ ...p, currentBet: 0 })),
        currentBet: prev.minimumBet
      }));
    }
  };

  const handleFold = () => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
    
    setGameContext(prev => {
      const updatedContext = fold(prev, currentPlayer.id);
      const activePlayers = updatedContext.players.filter(p => p.isActive);

      if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        const finalPot = updatedContext.pot; // Pot after rake
        toast({
          title: "Game Over",
          description: `${winner.name} wins ${finalPot} chips! (Total rake: ${updatedContext.rake} chips)`,
        });
        
        return {
          ...updatedContext,
          gameState: "waiting",
          players: updatedContext.players.map(p => ({
            ...p,
            chips: p.id === winner.id ? p.chips + finalPot : p.chips,
            cards: [],
            currentBet: 0,
            isActive: true,
            isTurn: false,
            isDealer: false
          })),
          pot: 0,
          rake: 0,
          communityCards: [],
          currentBet: 0
        };
      }

      return {
        ...updatedContext,
        currentPlayer: nextPlayerIndex,
        players: updatedContext.players.map((p, i) => ({
          ...p,
          isTurn: i === nextPlayerIndex && p.isActive
        }))
      };
    });

    toast({
      title: "Player folded",
      description: `${currentPlayer.name} has folded`,
    });
  };

  return {
    handleBet,
    handleFold,
    handleTimeout,
  };
};