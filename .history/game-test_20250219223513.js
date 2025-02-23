import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
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
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--window-position=0,0',
                '--window-size=1920,1080'
            ]
        });
        
        const context = await browser.newContext({
            viewport: null,  // This will use the window size instead of forcing a viewport
            deviceScaleFactor: 1
        });
        
        const page = await context.newPage();
        
        // Force window to maximize and center
        await page.evaluate(() => {
            window.moveTo(0, 0);
            window.resizeTo(screen.width, screen.height);
        });

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

        // Force any existing transitions to complete
        table.style.transition = 'none';
        
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
            // First, ensure the table container has the correct styles
            const container = table.parentElement;
            if (container) {
                container.style.position = 'fixed';
                container.style.inset = '0';
                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.style.justifyContent = 'center';
                container.style.width = '100vw';
                container.style.height = '100vh';
                container.style.overflow = 'hidden';
            }
            
            // Reset table styles
            table.style.position = 'relative';
            table.style.margin = '0 auto';
            table.style.transform = 'none';
            table.style.top = 'auto';
            table.style.left = 'auto';
            
            // Force layout recalculation
            table.style.display = 'none';
            table.offsetHeight; // Force reflow
            table.style.display = '';
            
            // Re-enable transitions
            requestAnimationFrame(() => {
                table.style.transition = '';
            });
            
            // Scroll into view if needed
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

async function analyzeScreenshotAndDecideAction(page, screenshotName) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const screenshotsDir = path.join(process.cwd(), 'Screenshots');
    
    // Ensure screenshots directory exists
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    const screenshotPath = path.join(screenshotsDir, `${screenshotName}_${timestamp}.png`);
    
    try {
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Saved screenshot: ${screenshotPath}`);
        
        // Analyze current state
        const state = await page.evaluate(() => {
            // Log HTML structure for debugging
            const gameContainer = document.querySelector('.game-table-container');
            if (gameContainer) {
                console.log('🔍 Game table HTML:', gameContainer.outerHTML);
            } else {
                const body = document.querySelector('body');
                console.log('🔍 Body HTML:', body.innerHTML);
            }

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
            const gameTable = document.querySelector('[data-testid="game-table"], .game-table-container, [data-component-name="div"][data-component-file="TableLayout.tsx"]');
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

        return { action: determineNextAction(state), state, screenshotPath };
    } catch (error) {
        console.error('❌ Failed to save screenshot:', error);
        return null;
    }
}

function determineNextAction(state) {
    if (state.errors && state.errors.length > 0) {
        return 'HANDLE_ERROR';
    }

    if (!state.hasGameTable && state.gameState.hasJoinButton) {
        return 'JOIN';
    }

    if (state.gameState.hasStartButton) {
        return 'START_HAND';
    }

    if (state.gameState.hasActionButtons) {
        return 'PLAY_TURN';
    }

    if (state.cards.length === 0 && state.players.length > 0) {
        return 'WAIT_FOR_START';
    }

    return 'WAIT';
}

async function joinGame(page, roomId) {
    const JOIN_TIMEOUT = 30000;
    const MAX_JOIN_ATTEMPTS = 5;
    let joinAttempts = 0;
    let lastAction = null;
    let lastScreenshot = null;
    let lastState = null;

    while (joinAttempts < MAX_JOIN_ATTEMPTS) {
        try {
            console.log(`Attempting to join a room (Attempt ${joinAttempts + 1}/${MAX_JOIN_ATTEMPTS})`);
            
            // Find all Join buttons in room cards
            const joinButtons = await page.$$('.p-4.border.rounded-lg.shadow button:has-text("Join")');
            
            if (joinButtons.length === 0) {
                throw new Error('No available rooms to join');
            }
            
            // Select the first available room
            const joinButton = joinButtons[0];
            console.log(`Found ${joinButtons.length} available rooms, joining the first one`);
            
            // Click the join button
            await joinButton.click();
            console.log('👆 Clicked join button');
            
            // Increase wait time and add multiple position checks
            await page.waitForTimeout(3000);
            await checkAndFixTablePosition(page);
            await page.waitForTimeout(1500);
            await checkAndFixTablePosition(page);
                
            // Verify we're in the game
            const gameTable = await page.$('[data-component-file="TableLayout.tsx"]');
            if (gameTable) {
                console.log('✅ Successfully joined game');
                // Double check table position after successful join
                await checkAndFixTablePosition(page);
                await page.waitForTimeout(1000);
                await checkAndFixTablePosition(page);
                return true;
            }

            joinAttempts++;
            await page.waitForTimeout(2000);

        } catch (error) {
            joinAttempts++;
            console.error(`🚨 Error joining room (Attempt ${joinAttempts}/${MAX_JOIN_ATTEMPTS})`, error);
            
            if (joinAttempts >= MAX_JOIN_ATTEMPTS) {
                throw new GameStateError('Failed to join game after maximum attempts', {
                    attempts: joinAttempts,
                    lastState: lastState
                });
            }

            await page.waitForTimeout(JOIN_TIMEOUT / MAX_JOIN_ATTEMPTS);
        }
    }

    throw new GameStateError('Max join attempts reached', { lastState });
}

async function startNewHand(page) {
    try {
        await retry(async () => {
            // First check and fix table position
            await checkAndFixTablePosition(page);
            await page.waitForTimeout(1000);  // Add small delay
            
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
            
            // Wait for players to be seated
            await page.waitForTimeout(2000);
            
            // Verify players are present
            const playersPresent = await page.evaluate(() => {
                const playerSpots = document.querySelectorAll('[data-component-file="PlayerSpot.tsx"]');
                return Array.from(playerSpots).some(spot => {
                    const playerName = spot.querySelector('p')?.textContent;
                    return playerName && playerName.length > 0;
                });
            });
            
            if (!playersPresent) {
                throw new Error('No players found after starting hand');
            }
            
            // Wait for initial betting round
            const initialState = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
                    text: b.textContent.toUpperCase(),
                    disabled: b.disabled,
                    visible: b.offsetParent !== null
                }));
                
                const playerSpots = document.querySelectorAll('[data-component-file="PlayerSpot.tsx"]');
                const activeSpot = document.querySelector('.border-emerald-500');
                const activePlayerName = activeSpot?.querySelector('p')?.textContent;
                
                return {
                    hasActionButtons: buttons.some(b => 
                        b.text.includes('CALL') || 
                        b.text.includes('FOLD') || 
                        b.text.includes('RAISE') ||
                        b.text.includes('CHECK')
                    ),
                    hasStartButton: buttons.some(b => b.text.includes('START NEW HAND')),
                    playerCount: playerSpots.length,
                    activePlayer: activePlayerName
                };
            });
            
            if (!initialState.hasActionButtons || initialState.hasStartButton) {
                throw new Error('Game did not start properly');
            }
            
            console.log('✅ Successfully started new hand');
            
            if (initialState.activePlayer?.startsWith('Bot')) {
                console.log('🌐 Browser: Bot turn detected:', initialState.activePlayer);
            }
        });
    } catch (error) {
        throw new GameStateError('Failed to start new hand', { error: error.message });
    }
}

async function handlePlayerTurn(page) {
    try {
        // First check and fix table position
        await checkAndFixTablePosition(page);
        await page.waitForTimeout(1000);  // Add small delay
        
        // Check if we're in a bot's turn
        const isBotTurn = await page.evaluate(() => {
            const activeSpot = document.querySelector('.border-emerald-500');
            if (!activeSpot) return false;
            const playerName = activeSpot.querySelector('p')?.textContent;
            return playerName?.startsWith('Bot');
        });

        if (isBotTurn) {
            console.log('🤖 Waiting for bot to complete their turn...');
            await page.waitForTimeout(2000);
            return true;
        }

        // Check game state
            const gameState = await page.evaluate(() => {
            const playerSpots = document.querySelectorAll('[data-component-file="PlayerSpot.tsx"]');
            const bets = Array.from(playerSpots).map(spot => {
                const betText = spot.querySelector('.text-amber-400')?.textContent;
                return betText ? parseFloat(betText.replace(/[^0-9.]/g, '')) : 0;
            });
            
            const currentBet = Math.max(...bets);
            const activePlayers = Array.from(playerSpots).filter(spot => 
                !spot.querySelector('.folded')).length;
            
            const allPlayersActed = bets.every(bet => bet === currentBet || bet === 0);
                
                return {
                activePlayers,
                allPlayersActed,
                currentCommunityCards: document.querySelectorAll('.card').length,
                playerBets: bets,
                currentBet
                };
            });
            
        console.log('🌐 Browser: Checking community cards:', gameState);

        // If all players have acted and we don't have community cards yet
        if (gameState.allPlayersActed && gameState.currentCommunityCards === 0) {
            console.log('🃏 Waiting for initial community cards...');
            try {
                await page.waitForSelector('.card', { timeout: 10000 });
            } catch (error) {
                console.log('⚠️ Timeout waiting for community cards');
            }
        }

        // Check for action buttons
        const actionButtons = await page.$$('button');
        let validActionFound = false;

        for (const button of actionButtons) {
            const buttonText = await button.evaluate(el => el.textContent.toUpperCase());
            const isDisabled = await button.evaluate(el => el.disabled);
            
            if ((buttonText.includes('CALL') || buttonText.includes('CHECK') || 
                 buttonText.includes('FOLD') || buttonText.includes('RAISE')) && !isDisabled) {
                console.log(`🎮 Found valid action: ${buttonText}`);
                await button.click();
                validActionFound = true;
                break;
            }
        }

        if (!validActionFound) {
            console.log('⏳ No valid actions available, waiting...');
            await page.waitForTimeout(1000);
        }

        return true;
    } catch (error) {
        console.error('🚨 Error in player turn:', error);
        throw new PlayerActionError('Failed to handle player turn', { error: error.message });
    }
}

// Helper function to save screenshot with analysis
async function captureScreenshot(page, name, details = {}) {
    // Ensure Screenshots directory exists
    if (!fs.existsSync('Screenshots')) {
        fs.mkdirSync('Screenshots');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(__dirname, 'Screenshots', `${name}_${timestamp}.png`);
    
    // Take screenshot
    await page.screenshot({ 
        path: filename,
        fullPage: true 
    });

    // Get page state
    const state = await page.evaluate(() => {
        return {
            url: window.location.href,
            title: document.title,
            gameTable: {
                exists: !!document.querySelector('.game-table-container'),
                dimensions: document.querySelector('.game-table-container')?.getBoundingClientRect(),
            },
            players: Array.from(document.querySelectorAll('[data-testid="player"]')).map(p => ({
                name: p.querySelector('.player-name')?.textContent,
                position: p.getAttribute('data-position'),
                isActive: p.classList.contains('active'),
                isTurn: p.classList.contains('turn'),
                chips: p.querySelector('.player-chips')?.textContent,
                cards: p.querySelectorAll('.card').length
            })),
            communityCards: document.querySelectorAll('.community-cards .card').length,
            pot: document.querySelector('[data-testid="pot"]')?.textContent,
            visibleButtons: Array.from(document.querySelectorAll('button')).map(b => ({
                text: b.textContent,
                disabled: b.disabled,
                visible: b.offsetParent !== null
            })),
            errors: Array.from(document.querySelectorAll('.error, .error-message')).map(e => e.textContent)
        };
    });

    // Save analysis with absolute path
    const analysisPath = `${filename}.analysis.json`;
    const analysis = {
        timestamp: new Date().toISOString(),
        screenshot: filename,
        state,
        details
    };

    await fs.promises.writeFile(
        analysisPath,
        JSON.stringify(analysis, null, 2)
    );

    console.log(`📸 Saved screenshot and analysis: ${filename}`);
    console.log('🔍 Page state:', state);

    return { filename, state };
}

// Helper function to check visual state
async function checkVisualState(page, expectedState = {}) {
    const state = await page.evaluate(() => {
        const gameTable = document.querySelector('.game-table-container');
        const tableRect = gameTable?.getBoundingClientRect();
        
        return {
            tableCentered: gameTable && 
                Math.abs((window.innerWidth - tableRect.width) / 2 - tableRect.left) < 10 &&
                Math.abs((window.innerHeight - tableRect.height) / 2 - tableRect.top) < 10,
            tableVisible: gameTable && 
                tableRect.width > 0 && 
                tableRect.height > 0 &&
                tableRect.top >= 0 && 
                tableRect.left >= 0,
            playersVisible: document.querySelectorAll('[data-testid="player"]').length > 0,
            cardsVisible: document.querySelectorAll('.card').length > 0,
            potVisible: !!document.querySelector('[data-testid="pot"]'),
            errors: Array.from(document.querySelectorAll('.error, .error-message')).map(e => e.textContent)
        };
    });

    console.log('👀 Visual state check:', state);
    
    if (state.errors.length > 0) {
        console.error('⚠️ Found UI errors:', state.errors);
    }

    if (!state.tableCentered || !state.tableVisible) {
        console.warn('⚠️ Table positioning issues detected');
    }

    return state;
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
        
        // Set up console message logging
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
        
        // Navigate to game
        await retry(async () => {
            await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
            await captureScreenshot(page, 'initial_load');
            await checkVisualState(page);
            await checkAndFixTablePosition(page);
        });
        
        // Login
        await login(page);
        const { state: loginState } = await captureScreenshot(page, 'after_login');
        console.log('Login state:', loginState);
        
        // Join game
        const gameStarted = await joinGame(page, 'roomId');
        const { state: joinState } = await captureScreenshot(page, 'after_join');
        console.log('Join state:', joinState);
        
        // Check table state after joining
        const tableState = await checkVisualState(page);
        if (!tableState.tableVisible || !tableState.tableCentered) {
            console.log('🔄 Fixing table position...');
            await page.evaluate(() => {
                const table = document.querySelector('.game-table-container');
                if (table) {
                    table.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'center'
                    });
                }
            });
            await captureScreenshot(page, 'table_position_fixed');
        }
        
        // Only try to start new hand if we haven't already started one
        if (gameStarted) {
            const { action } = await analyzeScreenshotAndDecideAction(page, 'game_started');
            if (action !== 'PLAY_TURN') {
                // Start new hand only if we're not already in a game
                await startNewHand(page);
                const { state: gameState } = await captureScreenshot(page, 'game_started');
                console.log('Game state:', gameState);
                
                // Verify all elements are visible
                const finalState = await checkVisualState(page);
                if (!finalState.cardsVisible || !finalState.playersVisible || !finalState.potVisible) {
                    console.error('⚠️ Some game elements are not visible:', finalState);
                }
            } else {
                console.log('✅ Game already in progress, skipping new hand start');
                const { state: currentState } = await captureScreenshot(page, 'game_in_progress');
                console.log('Current state:', currentState);
            }
        }

        // Take final screenshot of the game state
        await captureScreenshot(page, 'final_state');

    } catch (error) {
        // Log the error with full context
        logError(error, {
            location: 'runTest',
            url: page?.url()
        });
        
        // Take error screenshot
        if (page) {
            const { state: errorState } = await captureScreenshot(page, 'fatal_error');
            console.error('Error state:', errorState);
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