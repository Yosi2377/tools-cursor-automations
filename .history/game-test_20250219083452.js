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

async function checkAndFixTablePosition(page) {
    const tablePosition = await page.evaluate(() => {
        const table = document.querySelector('.game-table-container');
        if (!table) return null;

        const rect = table.getBoundingClientRect();
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        // Check if table is fully visible and centered
        const isFullyVisible = 
            rect.left >= 0 &&
            rect.top >= 0 &&
            rect.right <= viewport.width &&
            rect.bottom <= viewport.height;

        const isCentered = 
            Math.abs((viewport.width - rect.width) / 2 - rect.left) < 10 &&
            Math.abs((viewport.height - rect.height) / 2 - rect.top) < 10;

        // If not fully visible or not centered, fix it
        if (!isFullyVisible || !isCentered) {
            // First, ensure the table has the correct styles
            table.style.position = 'fixed';
            table.style.top = '50%';
            table.style.left = '50%';
            table.style.transform = 'translate(-50%, -50%)';
            table.style.margin = '0';
            table.style.zIndex = '1000';
            
            // Force layout recalculation
            table.style.display = 'none';
            table.offsetHeight; // Force reflow
            table.style.display = '';
            
            // Ensure the table container is visible
            table.scrollIntoView({
                behavior: 'auto',
                block: 'center',
                inline: 'center'
            });
            
            // Take a screenshot after centering
            const newRect = table.getBoundingClientRect();
            return {
                wasFixed: true,
                newRect,
                fixes: {
                    position: !isFullyVisible,
                    centering: !isCentered
                }
            };
        }

        return { 
            wasFixed: false, 
            rect,
            isFullyVisible,
            isCentered
        };
    });

    if (tablePosition && tablePosition.wasFixed) {
        console.log('📏 Fixed table position:', {
            newPosition: tablePosition.newRect,
            fixes: tablePosition.fixes
        });
        
        // Take a screenshot to verify the fix
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        await page.screenshot({ 
            path: `Screenshots/table_position_fixed_${timestamp}.png`,
            fullPage: true 
        });
        
        // Double check the position after a short delay
        await page.waitForTimeout(500);
        const verifyPosition = await page.evaluate(() => {
            const table = document.querySelector('.game-table-container');
            if (!table) return null;
            
            const rect = table.getBoundingClientRect();
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };
            
            return {
                rect,
                isFullyVisible: 
                    rect.left >= 0 &&
                    rect.top >= 0 &&
                    rect.right <= viewport.width &&
                    rect.bottom <= viewport.height,
                isCentered:
                    Math.abs((viewport.width - rect.width) / 2 - rect.left) < 10 &&
                    Math.abs((viewport.height - rect.height) / 2 - rect.top) < 10
            };
        });
        
        if (verifyPosition && (!verifyPosition.isFullyVisible || !verifyPosition.isCentered)) {
            console.log('⚠️ Table position still not perfect after fix:', verifyPosition);
        } else {
            console.log('✅ Table position verified');
        }
    }

    return tablePosition;
}

async function analyzeScreenshotAndDecideAction(page) {
    try {
        // Take screenshot and save it
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `Screenshots/state_${timestamp}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log('📸 Saved screenshot:', screenshotPath);

        // Analyze current state
        const state = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button')).map(b => {
                const rect = b.getBoundingClientRect();
                return {
                    text: b.textContent.toUpperCase(),
                    disabled: b.disabled,
                    visible: rect.width > 0 && rect.height > 0 && b.offsetParent !== null,
                    position: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    }
                };
            }).filter(b => b.visible);

            const errors = Array.from(document.querySelectorAll('.error, .error-message')).map(e => ({
                text: e.textContent,
                position: e.getBoundingClientRect()
            }));
            
            // Look for game table using both selectors
            const gameTable = document.querySelector('[data-testid="game-table"], .game-table-container');
            const gameTableRect = gameTable ? gameTable.getBoundingClientRect() : null;
            
            // Check if table is visible and positioned correctly
            const isTableVisible = gameTableRect && 
                gameTableRect.width > 0 && 
                gameTableRect.height > 0 && 
                gameTableRect.top >= 0 && 
                gameTableRect.left >= 0;
            
            const cards = Array.from(document.querySelectorAll('.card')).map(card => ({
                position: card.getBoundingClientRect()
            }));
            const players = Array.from(document.querySelectorAll('[data-testid="player"]')).map(player => ({
                position: player.getBoundingClientRect()
            }));
            
            return {
                buttons,
                errors,
                hasGameTable: !!gameTable && isTableVisible,
                gameTableRect,
                cards,
                players,
                gameState: {
                    hasStartButton: buttons.some(b => b.text.includes('START NEW HAND')),
                    hasJoinButton: buttons.some(b => b.text.includes('JOIN')),
                    hasLeaveButton: buttons.some(b => b.text.includes('LEAVE')),
                    hasActionButtons: buttons.some(b => 
                        b.text.includes('CALL') || 
                        b.text.includes('FOLD') || 
                        b.text.includes('RAISE') ||
                        b.text.includes('CHECK')
                    )
                }
            };
        });

        // Save detailed analysis with the screenshot
        const analysisPath = `${screenshotPath}.analysis.json`;
        await fs.promises.writeFile(analysisPath, JSON.stringify(state, null, 2));

        // Log detailed state for debugging
        console.log('🔍 Current game state:', {
            hasGameTable: state.hasGameTable,
            gameTablePosition: state.gameTableRect,
            visibleButtons: state.buttons.map(b => b.text),
            cardsCount: state.cards.length,
            playersCount: state.players.length,
            availableActions: state.gameState
        });

        // If we have a game table, check its position
        if (state.hasGameTable && state.gameTableRect) {
            await checkAndFixTablePosition(page);
        }

        // Decide next action based on state
        if (state.errors.length > 0) {
            console.error('⚠️ Found errors:', state.errors.map(e => e.text));
            return { action: 'HANDLE_ERROR', errors: state.errors, screenshot: screenshotPath };
        }

        // Check for specific buttons and their positions
        const joinButton = state.buttons.find(b => b.text.includes('JOIN'));
        if (!state.hasGameTable && joinButton) {
            console.log('🎯 Found JOIN button at position:', joinButton.position);
            return { action: 'JOIN', button: joinButton, screenshot: screenshotPath };
        }

        // Check for START NEW HAND button even if we don't see the table yet
        const startButton = state.buttons.find(b => b.text.includes('START NEW HAND'));
        if (startButton) {
            console.log('🎯 Found START NEW HAND button at position:', startButton.position);
            return { action: 'START_HAND', button: startButton, screenshot: screenshotPath };
        }

        const actionButton = state.buttons.find(b => 
            b.text.includes('CALL') || 
            b.text.includes('FOLD') || 
            b.text.includes('CHECK')
        );
        if (actionButton) {
            console.log('🎯 Found action button:', actionButton.text, 'at position:', actionButton.position);
            return { action: 'PLAY_TURN', button: actionButton, screenshot: screenshotPath };
        }

        if (state.cards.length === 0 && state.players.length > 0) {
            console.log('⏳ Table ready but waiting for start');
            return { action: 'WAIT_FOR_START', screenshot: screenshotPath };
        }

        console.log('⏳ Waiting for game state to update...');
        return { action: 'WAIT', state, screenshot: screenshotPath };
    } catch (error) {
        console.error('❌ Failed to analyze screenshot:', error);
        return { action: 'ERROR', error, screenshot: screenshotPath };
    }
}

async function joinGame(page, roomId) {
    const JOIN_TIMEOUT = 30000;
    const MAX_JOIN_ATTEMPTS = 5;
    let joinAttempts = 0;
    let lastAction = null;
    let lastScreenshot = null;

    while (joinAttempts < MAX_JOIN_ATTEMPTS) {
        try {
            console.log(`🌐 Attempting to join room: ${roomId} (Attempt ${joinAttempts + 1}/${MAX_JOIN_ATTEMPTS})`);
            
            // First, check and fix table position if needed
            await checkAndFixTablePosition(page);
            
            // Analyze current state with screenshot
            const { action, button, errors, screenshot, state } = await analyzeScreenshotAndDecideAction(page);
            lastScreenshot = screenshot;
            console.log('🎯 Decided action:', action, button ? `(${button.text})` : '');

            if (action === 'HANDLE_ERROR') {
                throw new GameStateError('Errors detected', { errors, screenshot });
            }

            if (action === 'JOIN' && lastAction !== 'JOIN' && button) {
                // Click the join button at its position
                await page.mouse.click(button.position.x + button.position.width/2, 
                                    button.position.y + button.position.height/2);
                console.log('👆 Clicked join button at position:', button.position);
                lastAction = 'JOIN';
                await page.waitForTimeout(2000);
                
                // Check table position again after joining
                await checkAndFixTablePosition(page);
            }

            if (action === 'START_HAND' && lastAction !== 'START_HAND' && button) {
                // Check table position before starting hand
                await checkAndFixTablePosition(page);
                
                // Make sure the button is in view
                await page.evaluate((buttonPos) => {
                    const element = document.elementFromPoint(buttonPos.x, buttonPos.y);
                    if (element && element.textContent.includes('START NEW HAND')) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, button.position);
                await page.waitForTimeout(1000);

                // Click the start hand button at its position
                await page.mouse.click(button.position.x + button.position.width/2, 
                                    button.position.y + button.position.height/2);
                console.log('🃏 Starting new hand at position:', button.position);
                lastAction = 'START_HAND';
                await page.waitForTimeout(2000);
            }

            if (action === 'WAIT') {
                console.log('⏳ Waiting for game state to update...');
                await page.waitForTimeout(2000);
                continue;
            }

            // Check if we've successfully joined and started
            if (action === 'PLAY_TURN') {
                console.log('✅ Successfully joined and started game');
                return true;
            }

            // Check if we have cards and players
            if (state && state.cards && state.cards.length > 0 && state.players && state.players.length > 0) {
                console.log('✅ Successfully joined and game is ready');
                return true;
            }

        } catch (error) {
            joinAttempts++;
            console.error(`🚨 Error joining room: ${roomId} (Attempt ${joinAttempts}/${MAX_JOIN_ATTEMPTS})`, error);
            
            // Take new error state screenshot
            const { state, screenshot } = await analyzeScreenshotAndDecideAction(page);
            console.error('❌ Error state analysis:', state);
            
            if (joinAttempts >= MAX_JOIN_ATTEMPTS) {
                throw new GameStateError('Failed to join game after maximum attempts', {
                    attempts: joinAttempts,
                    roomId,
                    lastScreenshot: screenshot
                });
            }

            await page.waitForTimeout(JOIN_TIMEOUT / MAX_JOIN_ATTEMPTS);
        }
    }

    throw new GameStateError('Max join attempts reached', { roomId });
}

async function startNewHand(page) {
    try {
        await retry(async () => {
            // First check and fix table position
            await checkAndFixTablePosition(page);
            
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
        // First check and fix table position
        await checkAndFixTablePosition(page);
        
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
        const gameStarted = await joinGame(page, 'roomId');
        
        // Only try to start new hand if we haven't already started one
        if (gameStarted) {
            const { action } = await analyzeScreenshotAndDecideAction(page);
            if (action !== 'PLAY_TURN') {
                // Start new hand only if we're not already in a game
                await startNewHand(page);
            } else {
                console.log('✅ Game already in progress, skipping new hand start');
            }
        }

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