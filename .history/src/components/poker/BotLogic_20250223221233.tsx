import { useEffect } from 'react';
import { GameContext, Player } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';
import { evaluateHand } from '@/utils/pokerLogic';

interface BotLogicProps {
  gameContext: GameContext;
  updateGameState: (updater: (prevState: GameContext) => GameContext) => void;
}

export const BotLogic = ({ gameContext, updateGameState }: BotLogicProps) => {
  useEffect(() => {
    const handleBotTurn = async () => {
      if (!gameContext.isInitialized || gameContext.gameState !== 'betting') return;

      const currentPlayer = gameContext.players[gameContext.currentPlayer];
      if (!currentPlayer || !currentPlayer.id.startsWith('bot-') || !currentPlayer.isTurn) return;

      // Add delay to simulate thinking
      await new Promise(resolve => setTimeout(resolve, 1500));

      const botDecision = makeBotDecision(currentPlayer, gameContext);
      await executeBotAction(botDecision, currentPlayer, gameContext, updateGameState);
    };

    handleBotTurn();
  }, [gameContext.currentPlayer, gameContext.gameState]);

  return null;
};

const makeBotDecision = (bot: Player, gameContext: GameContext) => {
  const handStrength = evaluateHand([...bot.cards, ...gameContext.communityCards]);
  const currentBet = gameContext.currentBet;
  const botBet = bot.currentBet || 0;
  const callAmount = currentBet - botBet;
  const potOdds = callAmount / (gameContext.pot + callAmount);

  // Simple bot strategy based on hand strength and pot odds
  if (handStrength > 0.7) {
    // Strong hand - raise
    return { action: 'raise', amount: currentBet * 2 };
  } else if (handStrength > 0.4 && potOdds < 0.3) {
    // Decent hand and good pot odds - call
    return { action: 'call', amount: callAmount };
  } else {
    // Weak hand - fold
    return { action: 'fold', amount: 0 };
  }
};

const executeBotAction = async (
  decision: { action: string; amount: number },
  bot: Player,
  gameContext: GameContext,
  updateGameState: (updater: (prevState: GameContext) => GameContext) => void
) => {
  try {
    const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;

    // Update bot state in database
    const { error: botError } = await supabase
      .from('game_players')
      .update({
        current_bet: decision.action === 'fold' ? bot.currentBet : bot.currentBet + decision.amount,
        is_turn: false,
        has_acted: true,
        has_folded: decision.action === 'fold',
        is_visible: true // Always keep bots visible
      })
      .eq('game_id', gameContext.gameId)
      .eq('user_id', bot.id);

    if (botError) throw botError;

    // Update next player
    const { error: nextPlayerError } = await supabase
      .from('game_players')
      .update({
        is_turn: true,
        is_visible: true // Always keep players visible
      })
      .eq('game_id', gameContext.gameId)
      .eq('user_id', gameContext.players[nextPlayerIndex].id);

    if (nextPlayerError) throw nextPlayerError;

    // Update game state
    const { error: gameError } = await supabase
      .from('games')
      .update({
        current_player_index: nextPlayerIndex,
        current_bet: Math.max(gameContext.currentBet, bot.currentBet + decision.amount),
        pot: gameContext.pot + decision.amount
      })
      .eq('id', gameContext.gameId);

    if (gameError) throw gameError;

    // Verify bot visibility
    const { data: verifyBot, error: verifyError } = await supabase
      .from('game_players')
      .select('is_visible')
      .eq('game_id', gameContext.gameId)
      .eq('user_id', bot.id)
      .single();

    if (verifyError || !verifyBot || !verifyBot.is_visible) {
      throw new Error('Failed to verify bot visibility');
    }

    // Update game context
    updateGameState(prev => ({
      ...prev,
      players: prev.players.map(p => {
        if (p.id === bot.id) {
          return {
            ...p,
            currentBet: decision.action === 'fold' ? p.currentBet : p.currentBet + decision.amount,
            chips: p.chips - decision.amount,
            isTurn: false,
            hasActed: true,
            hasFolded: decision.action === 'fold',
            lastAction: decision.action,
            isVisible: true // Always keep bots visible
          };
        }
        if (p.id === prev.players[nextPlayerIndex].id) {
          return {
            ...p,
            isTurn: true,
            isVisible: true // Always keep players visible
          };
        }
        return p;
      }),
      currentPlayer: nextPlayerIndex,
      currentBet: Math.max(prev.currentBet, bot.currentBet + decision.amount),
      pot: prev.pot + decision.amount
    }));
  } catch (error) {
    console.error('Error executing bot action:', error);
    throw error; // Re-throw to handle in the calling function
  }
}; 