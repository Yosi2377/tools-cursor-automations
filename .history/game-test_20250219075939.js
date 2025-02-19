import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { 
    GameError, 
    ConnectionError, 
    GameStateError, 
    PlayerActionError,
    RoundStuckError,
    retry,
    logError,
    recoverFromError
} from './src/utils/errorHandler.js';
import { analyzeGameState } from './src/utils/gameAnalyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function initializeBrowser() {
    try {
        const browser = await chromium.launch({ 
            headless: false,
            args: ['--start-maximized', '--no-sandbox']
        });
        
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            deviceScaleFactor: 1
        });
        
        const page = await context.newPage();
        
        // Set up error handling for console messages
        page.on('console', msg => {
            const text = msg.text();
            if (msg.type() === 'error') {
                console.error('🚨 Browser Error:', text);
            } else if (msg.type() === 'warning') {
                console.warn('⚠️ Browser Warning:', text);
            } else {
                console.log('🌐 Browser:', text);
            }
        });

        return { browser, context, page };
    } catch (error) {
        throw new ConnectionError('Failed to initialize browser', { error: error.message });
    }
}

async function login(page) {
    try {
        await retry(async () => {
            await page.waitForSelector('input[type="text"]');
            await page.waitForSelector('input[type="password"]');
            
            await page.fill('input[type="text"]', 'bigbaga123');
            await page.fill('input[type="password"]', '121212');
            await page.click('button[type="submit"]');
            
            // Wait for login to complete
            await page.waitForSelector('button:has-text("JOIN")', { timeout: 5000 });
        });
        
        console.log('✅ Login successful');
    } catch (error) {
        throw new ConnectionError('Login failed', { error: error.message });
    }
}

async function joinGame(page, roomId) {
    const JOIN_TIMEOUT = 15000; // 15 seconds
    const MAX_JOIN_ATTEMPTS = 5;
    let joinAttempts = 0;

    while (joinAttempts < MAX_JOIN_ATTEMPTS) {
        try {
            console.log(`🌐 Attempting to join room: ${roomId} (Attempt ${joinAttempts + 1}/${MAX_JOIN_ATTEMPTS})`);
            
            // Wait for either the game table or join button
            const element = await Promise.race([
                page.waitForSelector('[data-testid="game-table"]', { timeout: JOIN_TIMEOUT }),
                page.waitForSelector('button:has-text("JOIN")', { timeout: JOIN_TIMEOUT })
            ]);

            // Check which element we got
            const elementType = await element.evaluate(el => {
                if (el.hasAttribute('data-testid') && el.getAttribute('data-testid') === 'game-table') return 'table';
                return 'button';
            });

            if (elementType === 'table') {
                // Verify the game table is properly initialized
                const isError = await page.evaluate(() => {
                    const table = document.querySelector('[data-testid="game-table"]');
                    return table?.classList.contains('error') || false;
                });

                if (isError) {
                    console.log('⚠️ Game table in error state, waiting for initialization...');
                    await sleep(2000);
                    continue;
                }

                console.log('✅ Already at game table');
                return true;
            }

            // Click join button if found
            await element.click();
            console.log('👆 Clicked join button');

            // Wait for game table to appear and initialize
            await page.waitForSelector('[data-testid="game-table"]', { timeout: JOIN_TIMEOUT });
            
            // Check for error states
            const tableState = await page.evaluate(() => {
                const table = document.querySelector('[data-testid="game-table"]');
                if (!table) return 'missing';
                if (table.classList.contains('error')) return 'error';
                
                // Check for required elements
                const hasPhase = !!table.querySelector('.game-phase');
                const hasPlayers = !!table.querySelector('.player-positions');
                
                if (!hasPhase || !hasPlayers) return 'incomplete';
                return 'ready';
            });

            if (tableState === 'ready') {
                console.log('✅ Successfully joined game');
                return true;
            } else {
                console.log(`⚠️ Game table in ${tableState} state, waiting...`);
                await sleep(2000);
                continue;
            }

        } catch (error) {
            joinAttempts++;
            
            // Log the error with context
            logError(new GameStateError('Join attempt failed', {
                attempt: joinAttempts,
                maxAttempts: MAX_JOIN_ATTEMPTS,
                originalError: error
            }), {
                location: 'joinGame',
                roomId
            });

            if (joinAttempts >= MAX_JOIN_ATTEMPTS) {
                throw new GameStateError('Failed to join game after maximum attempts', {
                    attempts: joinAttempts,
                    roomId
                });
            }

            // Try to recover
            try {
                // Check if we're already in a game
                const gameTableExists = await page.evaluate(() => {
                    const table = document.querySelector('[data-testid="game-table"]');
                    return table && !table.classList.contains('error');
                });

                if (gameTableExists) {
                    console.log('✅ Found valid game table after recovery check');
                    return true;
                }

                // Refresh the page if we're stuck
                await page.reload();
                console.log('🔄 Page reloaded, waiting before next attempt...');
                await sleep(2000 * joinAttempts); // Progressive delay
            } catch (recoveryError) {
                console.log('⚠️ Recovery attempt failed:', recoveryError.message);
            }
        }
    }

    return false;
}

async function startNewHand(page) {
    try {
        await retry(async () => {
            const startButton = await page.waitForSelector('button:has-text("start new hand")', { timeout: 5000 });
            await startButton.click();
            
            // Wait for cards to appear
            await page.waitForSelector('.card', { timeout: 5000 });
        });
        
        console.log('✅ Successfully started new hand');
    } catch (error) {
        throw new GameStateError('Failed to start new hand', { error: error.message });
    }
}

async function handlePlayerTurn(page) {
    try {
        const actionButtons = await page.$$('.action-button:not([disabled])');
        if (actionButtons.length === 0) {
            throw new PlayerActionError('No available actions');
        }

        const gameState = await analyzeGameState(page);
        const currentBet = gameState.currentBet || 0;

        // Choose action based on bet amount
        if (currentBet <= 100) {
            const callButton = actionButtons.find(button => 
                button.evaluate(el => el.textContent.includes('Call'))
            );
            if (callButton) {
                await callButton.click();
                console.log('✅ Called bet');
                return true;
            }
        } else {
            const foldButton = actionButtons.find(button => 
                button.evaluate(el => el.textContent.includes('Fold'))
            );
            if (foldButton) {
                await foldButton.click();
                console.log('✅ Folded hand');
                return true;
            }
        }

        throw new PlayerActionError('No suitable action found');
    } catch (error) {
        if (error instanceof PlayerActionError) {
            throw error;
        }
        throw new PlayerActionError('Failed to handle player turn', { error: error.message });
    }
}

async function monitorGameState(page) {
    let monitoringTime = 0;
    const TOTAL_MONITORING_TIME = 300000; // 5 minutes
    const CHECK_INTERVAL = 2000; // 2 seconds
    let lastActionTime = Date.now();
    let consecutiveStuckRounds = 0;

    while (monitoringTime < TOTAL_MONITORING_TIME) {
        try {
            const gameState = await analyzeGameState(page);
            
            // Check for stuck game conditions
            if (gameState.error || 
                (gameState.phase === 'Error') || 
                (gameState.playerPositions === 0)) {
                
                throw new GameStateError('Game appears to be stuck', {
                    gameState,
                    monitoringTime
                });
            }

            // Check for stuck round
            if (gameState.roundState && gameState.roundState.isStuck) {
                consecutiveStuckRounds++;
                console.log(`⚠️ Detected stuck round (${consecutiveStuckRounds} consecutive)`);
                
                if (consecutiveStuckRounds >= 3) {
                    throw new RoundStuckError('Multiple consecutive stuck rounds detected', {
                        consecutiveStuckRounds,
                        gameState
                    });
                }
                
                // Try to recover from stuck round
                const recovered = await recoverFromError(new RoundStuckError('Round is stuck', {
                    roundState: gameState.roundState
                }), page);
                
                if (recovered) {
                    consecutiveStuckRounds = 0;
                    lastActionTime = Date.now();
                }
            } else {
                consecutiveStuckRounds = 0;
            }

            // Handle player turn if it's our turn
            if (gameState.activePlayer === 'player1') {
                await handlePlayerTurn(page);
                lastActionTime = Date.now();
            }

            // Check for long inactivity
            const currentTime = Date.now();
            if (currentTime - lastActionTime > 60000) { // 1 minute without action
                throw new GameStateError('No game activity detected', {
                    lastActionTime,
                    currentTime,
                    timeSinceLastAction: currentTime - lastActionTime
                });
            }

            await sleep(CHECK_INTERVAL);
            monitoringTime += CHECK_INTERVAL;

        } catch (error) {
            // Log the error
            logError(error, {
                location: 'monitorGameState',
                monitoringTime,
                consecutiveStuckRounds
            });

            // Attempt recovery
            const recovered = await recoverFromError(error, page);
            if (!recovered) {
                console.error('❌ Failed to recover from error, stopping monitoring');
                break;
            }
            
            // Reset action timer after recovery attempt
            lastActionTime = Date.now();
        }
    }
}

async function runTest() {
    let browser, context, page;
    
    try {
        // Create Screenshots directory
        if (!fs.existsSync('Screenshots')) {
            fs.mkdirSync('Screenshots');
        }

        console.log('🚀 Starting automated game test...\n');
        
        // Initialize browser
        ({ browser, context, page } = await initializeBrowser());
        
        // Navigate to game
        await retry(async () => {
            await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        });
        
        // Login
        await login(page);
        
        // Join game
        await joinGame(page, 'roomId');
        
        // Start new hand
        await startNewHand(page);
        
        // Monitor game state
        await monitorGameState(page);

    } catch (error) {
        // Log the error with full context
        logError(error, {
            location: 'runTest',
            url: page?.url()
        });
        
        // Take error screenshot
        if (page) {
            await page.screenshot({ 
                path: `Screenshots/fatal_error_${Date.now()}.png`,
                fullPage: true 
            });
        }
        
    } finally {
        // Clean up
        if (browser) {
            console.log('👋 Closing browser...');
            await browser.close();
        }
    }
}

runTest().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
}); 