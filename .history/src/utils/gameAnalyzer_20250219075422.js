import { GameStateError, PlayerActionError, retry, logError } from './errorHandler.js';

// Add loading state checks
async function checkLoadingState(page) {
    return await page.evaluate(() => {
        const state = {
            isLoading: false,
            loadingElements: [],
            networkRequests: window.performance.getEntriesByType('resource'),
            documentState: document.readyState,
            errors: []
        };

        // Check for loading indicators
        const loadingSelectors = [
            '.loading',
            '.spinner',
            '[data-loading]',
            '[aria-busy="true"]',
            '.progress'
        ];

        loadingSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                state.isLoading = true;
                state.loadingElements.push({
                    selector,
                    count: elements.length
                });
            }
        });

        // Check for error messages
        const errorSelectors = [
            '.error',
            '.error-message',
            '[data-error]',
            '.alert-danger'
        ];

        errorSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                state.errors.push({
                    selector,
                    message: el.textContent
                });
            });
        });

        return state;
    });
}

// Add round timeout detection
const ROUND_TIMEOUT = 30000; // 30 seconds
const roundTimeouts = new Map();

// Add round state tracking
const roundState = {
    lastActionTime: null,
    lastActivePlayer: null,
    playersActed: new Set(),
    roundNumber: 0,
    isStuck: false
};

async function checkRoundTimeout(page, gameState) {
    const currentTime = Date.now();
    const activePlayer = gameState.activePlayer;

    // Update round state
    if (activePlayer !== roundState.lastActivePlayer) {
        roundState.lastActionTime = currentTime;
        roundState.lastActivePlayer = activePlayer;
        if (activePlayer) {
            roundState.playersActed.add(activePlayer);
        }
    }

    // Check if round is stuck
    if (roundState.lastActionTime && (currentTime - roundState.lastActionTime > ROUND_TIMEOUT)) {
        // If all players have acted or we're waiting too long for the last player
        if (roundState.playersActed.size >= gameState.playerPositions || 
            (currentTime - roundState.lastActionTime > ROUND_TIMEOUT * 2)) {
            
            console.log('⚠️ Round appears to be stuck:');
            console.log(`   Last action: ${Math.floor((currentTime - roundState.lastActionTime) / 1000)}s ago`);
            console.log(`   Players acted: ${roundState.playersActed.size}/${gameState.playerPositions}`);
            console.log(`   Last active player: ${roundState.lastActivePlayer}`);

            // Try to force round end
            await forceRoundEnd(page);
            
            // Reset round state
            roundState.lastActionTime = currentTime;
            roundState.playersActed.clear();
            roundState.roundNumber++;
            roundState.isStuck = true;
            
            return true;
        }
    }

    return false;
}

async function forceRoundEnd(page) {
    try {
        console.log('🔄 Attempting to force round end...');

        // First try: Click any available action button
        const actionButtons = await page.$$('.action-button:not([disabled])');
        if (actionButtons.length > 0) {
            console.log('👆 Clicking available action button...');
            await actionButtons[0].click();
            await page.waitForTimeout(2000);
            return;
        }

        // Second try: Try to start new hand
        const startButton = await page.$('button:has-text("start new hand")');
        if (startButton) {
            console.log('🃏 Starting new hand...');
            await startButton.click();
            await page.waitForTimeout(2000);
            return;
        }

        // Third try: Leave and rejoin the game
        const leaveButton = await page.$('button:has-text("Leave Room")');
        if (leaveButton) {
            console.log('👋 Leaving stuck game...');
            await leaveButton.click();
            await page.waitForTimeout(2000);

            const joinButton = await page.$('button:has-text("JOIN")');
            if (joinButton) {
                console.log('🎲 Rejoining game...');
                await joinButton.click();
                await page.waitForTimeout(2000);
            }
        }

    } catch (error) {
        console.error('❌ Failed to force round end:', error);
        throw new GameStateError('Failed to force round end', { error: error.message });
    }
}

export async function analyzeGameState(page) {
    try {
        // First check loading state
        const loadingState = await checkLoadingState(page);
        if (loadingState.isLoading) {
            console.log('⏳ Game is still loading:', loadingState.loadingElements);
            throw new GameStateError('Game is still loading', { loadingState });
        }

        if (loadingState.errors.length > 0) {
            console.error('❌ Found error messages:', loadingState.errors);
            throw new GameStateError('Error messages found', { errors: loadingState.errors });
        }

        // Retry the analysis operation with exponential backoff
        const gameState = await retry(async () => {
            // Find game phase
            const phaseElement = await page.$('[data-testid="game-phase"], .game-status');
            if (!phaseElement) {
                throw new GameStateError('Game phase element not found', {
                    selector: '[data-testid="game-phase"], .game-status'
                });
            }
            const phase = await phaseElement.evaluate(el => el.textContent);

            // Find pot size with validation
            const potElement = await page.$('[data-testid="pot-size"], .total-pot');
            if (!potElement) {
                throw new GameStateError('Pot size element not found', {
                    selector: '[data-testid="pot-size"], .total-pot'
                });
            }
            const potSize = await potElement.evaluate(el => {
                const text = el.textContent;
                const value = parseInt(text.replace(/[^0-9]/g, ''));
                if (isNaN(value)) {
                    throw new Error('Invalid pot size format');
                }
                return value;
            });

            // Find current bet with validation
            const betElement = await page.$('[data-testid="current-bet"], .bet-size');
            if (!betElement) {
                throw new GameStateError('Current bet element not found', {
                    selector: '[data-testid="current-bet"], .bet-size'
                });
            }
            const currentBet = await betElement.evaluate(el => {
                const text = el.textContent;
                const value = parseInt(text.replace(/[^0-9]/g, ''));
                if (isNaN(value)) {
                    throw new Error('Invalid bet format');
                }
                return value;
            });

            // Find active player with validation
            const activeElement = await page.$('[data-testid="active-player"], .turn-player');
            if (!activeElement) {
                throw new GameStateError('Active player element not found', {
                    selector: '[data-testid="active-player"], .turn-player'
                });
            }
            const activePlayer = await activeElement.evaluate(el => {
                const playerId = el.getAttribute('data-player-id');
                if (!playerId) {
                    throw new Error('Player ID not found');
                }
                return playerId;
            });

            // Find community cards with validation
            const communityCards = await page.$$('[data-testid="community-card"], .poker-community-card');
            const communityCardsCount = communityCards.length;

            // Find player positions with validation
            const playerElements = await page.$$('[data-testid="player"]');
            if (playerElements.length === 0) {
                throw new GameStateError('No player positions found', {
                    selector: '[data-testid="player"]'
                });
            }

            const playerPositions = await Promise.all(
                playerElements.map(async (element, index) => {
                    try {
                        const position = await element.evaluate(el => {
                            const rect = el.getBoundingClientRect();
                            return {
                                x: rect.x,
                                y: rect.y,
                                index
                            };
                        });
                        return position;
                    } catch (error) {
                        throw new GameStateError(`Failed to get position for player ${index}`, {
                            playerIndex: index,
                            error: error.message
                        });
                    }
                })
            );

            // Find action buttons with validation
            const actionButtons = await page.$$('[data-testid^="action-"]');
            const availableActions = await Promise.all(
                actionButtons.map(async (button, index) => {
                    try {
                        const type = await button.evaluate(el => {
                            const actionType = el.getAttribute('data-testid').replace('action-', '');
                            if (!actionType) {
                                throw new Error('Invalid action type');
                            }
                            return actionType;
                        });

                        const amount = await button.evaluate(el => {
                            const text = el.textContent;
                            const match = text.match(/\$(\d+)/);
                            return match ? parseInt(match[1]) : null;
                        });

                        return { type, amount };
                    } catch (error) {
                        throw new PlayerActionError(`Failed to analyze action button ${index}`, {
                            buttonIndex: index,
                            error: error.message
                        });
                    }
                })
            );

            // Check for error messages
            const errorElement = await page.$('[data-testid="error"], .error-popup');
            const error = errorElement ? await errorElement.evaluate(el => el.textContent) : null;

            // Validate the complete game state
            const gameState = {
                phase,
                potSize,
                currentBet,
                activePlayer,
                communityCardsCount,
                playerPositions: playerPositions.length,
                availableActions,
                error,
                loadingState
            };

            // Log successful analysis
            console.log('✅ Game state analysis completed successfully');
            return gameState;
        });

        // Add round state information
        const enhancedGameState = {
            ...gameState,
            roundState: {
                lastActionTime: roundState.lastActionTime,
                playersActed: Array.from(roundState.playersActed),
                roundNumber: roundState.roundNumber,
                isStuck: roundState.isStuck
            }
        };

        // Check for round timeout
        const isRoundStuck = await checkRoundTimeout(page, enhancedGameState);
        if (isRoundStuck) {
            enhancedGameState.isRoundStuck = true;
        }

        return enhancedGameState;
    } catch (error) {
        // Log the error with context
        logError(error, {
            location: 'analyzeGameState',
            url: page.url()
        });

        // Return a safe default state
        return {
            phase: 'Error',
            potSize: 0,
            currentBet: 0,
            activePlayer: null,
            communityCardsCount: 0,
            playerPositions: 0,
            availableActions: [],
            error: error.message,
            loadingState
        };
    }
} 