import React, { useState, useEffect } from 'react';
import PlayerSpot from './PlayerSpot';
import { GameContext } from '../types/poker';
import GameControls from './poker/GameControls';
import CommunityCards from './poker/CommunityCards';
import PotDisplay from './poker/PotDisplay';
import TableFelt from './poker/TableFelt';
import { Button } from './ui/button';
import { Menu, LogOut } from 'lucide-react';
import LeaderBoard from './poker/LeaderBoard';
import { useGameLogic } from './poker/GameLogic';
import { useBettingLogic } from './poker/BettingLogic';
import { useCardDealing } from './poker/CardDealing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

const PokerTable = () => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const isMobile = useIsMobile();
  
  const [gameContext, setGameContext] = useState<GameContext>({
    players: [
      { id: 1, name: "You", chips: 1000, cards: [], position: "bottom", isActive: true, currentBet: 0, isTurn: false, score: 0 },
      { id: 2, name: "John", chips: 1500, cards: [], position: "bottomLeft", isActive: true, currentBet: 0, isTurn: false, score: 120 },
      { id: 3, name: "Alice", chips: 2000, cards: [], position: "left", isActive: true, currentBet: 0, isTurn: false, score: 350 },
      { id: 4, name: "Bob", chips: 800, cards: [], position: "topLeft", isActive: true, currentBet: 0, isTurn: false, score: 80 },
      { id: 5, name: "Carol", chips: 1200, cards: [], position: "top", isActive: true, currentBet: 0, isTurn: false, score: 200 },
      { id: 6, name: "Dave", chips: 1800, cards: [], position: "topRight", isActive: true, currentBet: 0, isTurn: false, score: 150 },
      { id: 7, name: "Eve", chips: 900, cards: [], position: "right", isActive: true, currentBet: 0, isTurn: false, score: 90 },
      { id: 8, name: "Frank", chips: 1600, cards: [], position: "bottomRight", isActive: true, currentBet: 0, isTurn: false, score: 180 },
      { id: 9, name: "Grace", chips: 1300, cards: [], position: "leftTop", isActive: true, currentBet: 0, isTurn: false, score: 220 },
      { id: 10, name: "Henry", chips: 1100, cards: [], position: "leftBottom", isActive: true, currentBet: 0, isTurn: false, score: 130 },
    ],
    pot: 0,
    rake: 0,
    communityCards: [],
    currentPlayer: 0,
    gameState: "waiting",
    minimumBet: 20,
    currentBet: 0,
    dealerPosition: 0,
  });

  const { dealCommunityCards } = useCardDealing();
  const { startNewHand } = useGameLogic(gameContext, setGameContext);
  const { handleBet, handleFold, handleTimeout } = useBettingLogic(
    gameContext,
    setGameContext,
    (count: number) => {
      const cards = dealCommunityCards(count);
      return cards;
    }
  );

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
  }, []);

  useEffect(() => {
    const initializeGame = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        const { data: game, error: gameError } = await supabase
          .from('games')
          .insert([{
            status: 'waiting',
            pot: 0,
            rake: 0,
            current_bet: 0,
            dealer_position: 0,
            community_cards: [],
            minimum_bet: 20,
          }])
          .select()
          .single();

        if (gameError) throw gameError;

        // Add players to the game
        const { error: playersError } = await supabase
          .from('game_players')
          .insert(
            gameContext.players.map(player => ({
              game_id: game.id,
              user_id: user.id,
              position: player.position,
              chips: player.chips,
              cards: JSON.stringify(player.cards),
              is_active: player.isActive,
              current_bet: player.currentBet,
              is_turn: player.isTurn,
              score: player.score,
            }))
          );

        if (playersError) throw playersError;

        toast('Game initialized successfully!');
      } catch (error) {
        console.error('Error initializing game:', error);
        toast('Failed to initialize game');
      }
    };

    initializeGame();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  return (
    <div className="relative w-full h-screen bg-poker-background p-4 overflow-hidden">
      <div className="flex justify-between items-center absolute top-4 left-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowLeaderboard(!showLeaderboard)}
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {showLeaderboard && (
        <LeaderBoard 
          players={gameContext.players}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      <div className={`absolute ${isMobile ? 'inset-4' : 'inset-16'} bg-transparent`}>
        <TableFelt />
        <PotDisplay amount={gameContext.pot} rake={gameContext.rake} />
        <CommunityCards cards={gameContext.communityCards} />
        
        {gameContext.players.map((player) => (
          <PlayerSpot 
            key={player.id} 
            player={player} 
            onTimeout={player.isTurn ? handleTimeout : undefined}
          />
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