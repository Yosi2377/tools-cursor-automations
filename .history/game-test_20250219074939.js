import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { 
    GameError, 
    ConnectionError, 
    GameStateError, 
    PlayerActionError,
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

async function joinGame(page) {
    try {
        await retry(async () => {
            const joinButton = await page.waitForSelector('button:has-text("JOIN")', { timeout: 5000 });
            await joinButton.click();
            
            // Wait for game table to be visible
            await page.waitForSelector('.game-table-container', { timeout: 5000 });
        });
        
        console.log('✅ Successfully joined game');
    } catch (error) {
        throw new GameStateError('Failed to join game', { error: error.message });
    }
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

            // Handle player turn if it's our turn
            if (gameState.activePlayer === 'player1') {
                await handlePlayerTurn(page);
            }

            await sleep(CHECK_INTERVAL);
            monitoringTime += CHECK_INTERVAL;

        } catch (error) {
            // Log the error
            logError(error, {
                location: 'monitorGameState',
                monitoringTime
            });

            // Attempt recovery
            const recovered = await recoverFromError(error, page);
            if (!recovered) {
                console.error('❌ Failed to recover from error, stopping monitoring');
                break;
            }
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
        await joinGame(page);
        
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