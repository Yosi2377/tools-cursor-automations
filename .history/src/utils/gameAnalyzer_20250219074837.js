import { GameStateError, PlayerActionError, retry, logError } from './errorHandler.js';

export async function analyzeGameState(page) {
    try {
        // Retry the analysis operation with exponential backoff
        return await retry(async () => {
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
                error
            };

            // Log successful analysis
            console.log('✅ Game state analysis completed successfully');
            return gameState;
        });
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
            error: error.message
        };
    }
} 