import { GameContext, Player } from '@/types/poker';
import { toast } from '@/components/ui/use-toast';
import { handleGameEnd } from './gameEndHandler';

export const handleFold = (
  gameContext: GameContext,
  currentPlayer: Player,
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>
) => {
  const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
  
  const updatedContext = {
    ...gameContext,
    players: gameContext.players.map(p => 
      p.id === currentPlayer.id
        ? { ...p, isActive: false }
        : p
    ),
    currentPlayer: nextPlayerIndex,
  };

  const activePlayers = updatedContext.players.filter(p => p.isActive);

  if (activePlayers.length === 1) {
    return handleGameEnd(
      activePlayers[0],
      updatedContext.pot,
      updatedContext.rake,
      updatedContext.players,
      gameContext.dealerPosition
    );
  }

  toast({
    title: "Player folded",
    description: `${currentPlayer.name} has folded`,
  });

  return updatedContext;
};