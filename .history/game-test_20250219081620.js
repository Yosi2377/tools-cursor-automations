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

async function analyzeScreenshot(page, context) {
    try {
        // Take a screenshot and save it with context
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `Screenshots/${context}_${timestamp}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        
        // Analyze the current state
        const state = await page.evaluate(() => {
            return {
                url: window.location.href,
                elements: {
                    pokerTable: document.querySelector('[data-testid="poker-table"]')?.outerHTML,
                    gameTable: document.querySelector('.game-table-container')?.outerHTML,
                    players: document.querySelectorAll('[data-testid="player"]').length,
                    buttons: Array.from(document.querySelectorAll('button')).map(b => ({
                        text: b.textContent,
                        disabled: b.disabled,
                        visible: b.offsetParent !== null
                    })),
                    cards: document.querySelectorAll('.card').length,
                    errors: Array.from(document.querySelectorAll('.error, .error-message')).map(e => e.textContent)
                },
                console: {
                    errors: window.consoleErrors || [],
                    warnings: window.consoleWarnings || []
                }
            };
        });

        // Save state analysis
        const analysisPath = `Screenshots/${context}_analysis_${timestamp}.txt`;
        await fs.promises.writeFile(analysisPath, JSON.stringify(state, null, 2));

        return state;
    } catch (error) {
        console.error('❌ Failed to analyze screenshot:', error);
        return null;
    }
}

// Add console error tracking
async function setupConsoleTracking(page) {
    await page.evaluate(() => {
        window.consoleErrors = [];
        window.consoleWarnings = [];
        
        const originalError = console.error;
        console.error = function(...args) {
            window.consoleErrors.push({
                timestamp: new Date().toISOString(),
                message: args.map(arg => String(arg)).join(' ')
            });
            originalError.apply(console, args);
        };

        const originalWarn = console.warn;
        console.warn = function(...args) {
            window.consoleWarnings.push({
                timestamp: new Date().toISOString(),
                message: args.map(arg => String(arg)).join(' ')
            });
            originalWarn.apply(console, args);
        };
    });
}

async function analyzeScreenshotAndDecideAction(page) {
    try {
        // Take screenshot and analyze current state
        const state = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
                text: b.textContent.toUpperCase(),
                disabled: b.disabled,
                visible: b.offsetParent !== null,
                rect: b.getBoundingClientRect()
            }));

            const errors = Array.from(document.querySelectorAll('.error, .error-message')).map(e => e.textContent);
            
            const gameTable = document.querySelector('[data-testid="poker-table"]');
            const cards = document.querySelectorAll('.card');
            const players = document.querySelectorAll('[data-testid="player"]');
            
            return {
                buttons,
                errors,
                hasGameTable: !!gameTable,
                cardsCount: cards.length,
                playersCount: players.length,
                gameState: {
                    hasStartButton: buttons.some(b => b.text.includes('START NEW HAND')),
                    hasJoinButton: buttons.some(b => b.text.includes('JOIN')),
                    hasLeaveButton: buttons.some(b => b.text.includes('LEAVE')),
                    hasActionButtons: buttons.some(b => b.text.includes('CALL') || b.text.includes('FOLD') || b.text.includes('RAISE'))
                }
            };
        });

        // Save analysis for debugging
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const analysisPath = `Screenshots/state_analysis_${timestamp}.txt`;
        await fs.promises.writeFile(analysisPath, JSON.stringify(state, null, 2));

        console.log('🔍 Current game state:', {
            hasGameTable: state.hasGameTable,
            cardsCount: state.cardsCount,
            playersCount: state.playersCount,
            availableActions: state.gameState
        });

        // Decide next action based on state
        if (state.errors.length > 0) {
            console.error('⚠️ Found errors:', state.errors);
            return { action: 'HANDLE_ERROR', errors: state.errors };
        }

        if (!state.hasGameTable && state.gameState.hasJoinButton) {
            return { action: 'JOIN' };
        }

        if (state.hasGameTable) {
            if (state.gameState.hasStartButton) {
                return { action: 'START_HAND' };
            }
            if (state.gameState.hasActionButtons) {
                return { action: 'PLAY_TURN' };
            }
            if (state.cardsCount === 0 && state.playersCount > 0) {
                return { action: 'WAIT_FOR_START' };
            }
        }

        return { action: 'WAIT', state };
    } catch (error) {
        console.error('❌ Failed to analyze screenshot:', error);
        return { action: 'ERROR', error };
    }
}

async function joinGame(page, roomId) {
    const JOIN_TIMEOUT = 30000;
    const MAX_JOIN_ATTEMPTS = 5;
    let joinAttempts = 0;
    let lastAction = null;

    while (joinAttempts < MAX_JOIN_ATTEMPTS) {
        try {
            console.log(`🌐 Attempting to join room: ${roomId} (Attempt ${joinAttempts + 1}/${MAX_JOIN_ATTEMPTS})`);
            
            // Analyze current state and decide action
            const { action, state, errors } = await analyzeScreenshotAndDecideAction(page);
            console.log('🎯 Decided action:', action);

            if (action === 'HANDLE_ERROR') {
                throw new GameStateError('Errors detected', { errors });
            }

            if (action === 'JOIN' && lastAction !== 'JOIN') {
                const joinButton = await page.$('button:has-text("JOIN")');
                if (joinButton) {
                    await joinButton.click();
                    console.log('👆 Clicked join button');
                    lastAction = 'JOIN';
                    await page.waitForTimeout(2000);
                }
            }

            if (action === 'START_HAND' && lastAction !== 'START_HAND') {
                const startButton = await page.$('button:has-text("START NEW HAND")');
                if (startButton) {
                    await startButton.click();
                    console.log('🃏 Starting new hand...');
                    lastAction = 'START_HAND';
                    await page.waitForTimeout(2000);
                }
            }

            if (action === 'WAIT') {
                console.log('⏳ Waiting for game state to update...');
                await page.waitForTimeout(2000);
                continue;
            }

            // Check if we've successfully joined and started
            if (action === 'PLAY_TURN' || (state?.cardsCount > 0 && state?.playersCount > 0)) {
                console.log('✅ Successfully joined and started game');
                return true;
            }

        } catch (error) {
            joinAttempts++;
            lastAction = null;
            
            // Take error state screenshot and analyze
            const errorState = await analyzeScreenshotAndDecideAction(page);
            console.error('❌ Error state analysis:', errorState);
            
            // Log the error with context
            logError(new GameStateError('Join attempt failed', {
                attempt: joinAttempts,
                maxAttempts: MAX_JOIN_ATTEMPTS,
                originalError: error,
                lastState: errorState
            }));

            if (joinAttempts >= MAX_JOIN_ATTEMPTS) {
                throw new GameStateError('Failed to join game after maximum attempts', {
                    attempts: joinAttempts,
                    roomId
                });
            }

            // Try to recover
            console.log('🔄 Attempting recovery...');
            await page.reload();
            await page.waitForTimeout(2000 * joinAttempts);
        }
    }

    return false;
}

async function startNewHand(page) {
    try {
        await retry(async () => {
            // Look for START NEW HAND button (case insensitive)
            const buttons = await page.$$('button');
            let startButton = null;
            
            for (const button of buttons) {
                const text = await button.evaluate(el => el.textContent.toUpperCase());
                if (text.includes('START NEW HAND')) {
                    startButton = button;
                    break;
                }
            }
            
            if (!startButton) {
                throw new Error('START NEW HAND button not found');
            }
            
            console.log('🃏 Clicking START NEW HAND button...');
            await startButton.click();
            
            // Wait for cards to appear
            await page.waitForSelector('.card', { timeout: 5000 });
            console.log('✅ Successfully started new hand');
        });
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