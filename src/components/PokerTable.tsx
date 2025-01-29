import React, { useState } from 'react';
import PlayerSpot from './PlayerSpot';
import { GameContext } from '../types/poker';
import { dealCards, placeBet, fold } from '../utils/pokerLogic';
import { toast } from '@/components/ui/use-toast';
import GameControls from './poker/GameControls';
import CommunityCards from './poker/CommunityCards';
import PotDisplay from './poker/PotDisplay';
import TableFelt from './poker/TableFelt';

const PokerTable = () => {
  const [gameContext, setGameContext] = useState<GameContext>({
    players: [
      { id: 1, name: "Player 1", chips: 1000, cards: [], position: "bottom", isActive: true, currentBet: 0, isTurn: false },
      { id: 2, name: "Player 2", chips: 1500, cards: [], position: "left", isActive: true, currentBet: 0, isTurn: false },
      { id: 3, name: "Player 3", chips: 2000, cards: [], position: "top", isActive: true, currentBet: 0, isTurn: false },
      { id: 4, name: "Player 4", chips: 800, cards: [], position: "right", isActive: true, currentBet: 0, isTurn: false },
    ],
    pot: 0,
    communityCards: [],
    currentPlayer: 0,
    gameState: "waiting",
    minimumBet: 20,
    currentBet: 0,
  });

  const startNewHand = () => {
    const { updatedPlayers, remainingDeck } = dealCards(gameContext.players);
    setGameContext(prev => ({
      ...prev,
      players: updatedPlayers.map((p, i) => ({ ...p, isTurn: i === 0 })),
      gameState: "betting",
      currentPlayer: 0,
      communityCards: [],
      pot: 0,
      currentBet: prev.minimumBet
    }));
    toast({
      title: "New hand started",
      description: "Cards have been dealt to all players",
    });
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

    const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
    const updatedContext = placeBet(gameContext, currentPlayer.id, amount);
    
    setGameContext(prev => ({
      ...updatedContext,
      currentPlayer: nextPlayerIndex,
      players: updatedContext.players.map((p, i) => ({
        ...p,
        isTurn: i === nextPlayerIndex && p.isActive
      }))
    }));

    toast({
      title: "Bet placed",
      description: `${currentPlayer.name} bet ${amount} chips`,
    });

    // Check if we need to deal community cards
    const activePlayers = updatedContext.players.filter(p => p.isActive);
    const allPlayersActed = activePlayers.every(p => p.currentBet === updatedContext.currentBet);
    
    if (allPlayersActed && activePlayers.length > 1) {
      if (updatedContext.communityCards.length === 0) {
        dealCommunityCards(3);
      } else if (updatedContext.communityCards.length === 3) {
        dealCommunityCards(1);
      } else if (updatedContext.communityCards.length === 4) {
        dealCommunityCards(1);
      }
    }
  };

  const dealCommunityCards = (count: number) => {
    const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
    const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    
    const newCards: Card[] = Array(count).fill(null).map(() => ({
      suit: suits[Math.floor(Math.random() * suits.length)],
      rank: ranks[Math.floor(Math.random() * ranks.length)],
      faceUp: true
    }));

    setGameContext(prev => ({
      ...prev,
      communityCards: [...prev.communityCards, ...newCards],
      players: prev.players.map(p => ({ ...p, currentBet: 0 })),
      currentBet: prev.minimumBet
    }));

    toast({
      title: "Community cards dealt",
      description: `${count} new card${count > 1 ? 's' : ''} dealt to the table`,
    });
  };

  const handleFold = () => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
    
    setGameContext(prev => {
      const updatedContext = fold(prev, currentPlayer.id);
      const activePlayers = updatedContext.players.filter(p => p.isActive);

      if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        toast({
          title: "Game Over",
          description: `${winner.name} wins ${updatedContext.pot} chips!`,
        });
        
        return {
          ...updatedContext,
          gameState: "waiting",
          players: updatedContext.players.map(p => ({
            ...p,
            chips: p.id === winner.id ? p.chips + updatedContext.pot : p.chips,
            cards: [],
            currentBet: 0,
            isActive: true,
            isTurn: false
          })),
          pot: 0,
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

  return (
    <div className="relative w-full h-screen bg-poker-background p-4 overflow-hidden">
      <div className="absolute inset-8 bg-poker-table rounded-full border-8 border-poker-accent/20 shadow-2xl">
        <TableFelt />
        <PotDisplay amount={gameContext.pot} />
        <CommunityCards cards={gameContext.communityCards} />
        
        {gameContext.players.map((player) => (
          <PlayerSpot key={player.id} player={player} />
        ))}
      </div>

      <GameControls
        gameContext={gameContext}
        onStartHand={startNewHand}
        onBet={handleBet}
        onFold={handleFold}
      />
    </div>
  );
};

export default PokerTable;
