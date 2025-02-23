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
            viewport: { width: 1920, height: 1080 },
            deviceScaleFactor: 1
        });
        
        const page = await context.newPage();
        
        // Enhanced console logging
        page.on('console', msg => {
            const text = msg.text();
            const type = msg.type();
            console.log(`🌐 Browser ${type}:`, text);
        });
        
        page.on('pageerror', error => {
            console.error('🚨 Page Error:', error);
        });
        
        page.on('requestfailed', request => {
            console.error('🚨 Failed Request:', request.url(), request.failure().errorText);
        });
        
        // Force window to maximize and center
        await page.evaluate(() => {
            window.moveTo(0, 0);
            window.resizeTo(screen.width, screen.height);
        });

        return { browser, context, page };
    } catch (error) {
        throw new ConnectionError('Failed to initialize browser', { error: error.message });
    }
}

async function login(page) {
    try {
        const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-config.json')));
        await retry(async () => {
            await page.waitForSelector('#root:not(:empty)', { timeout: 10000 });
            const pageState = await page.evaluate(() => {
                const inputs = Array.from(document.querySelectorAll('input'));
                const buttons = Array.from(document.querySelectorAll('button'));
                return {
                    inputs: inputs.map(i => ({ type: i.type, id: i.id, class: i.className })),
                    buttons: buttons.map(b => ({ text: b.textContent, class: b.className })),
                    rootContent: document.getElementById('root').innerHTML
                };
            });
            console.log('Page state before login:', pageState);
            await page.waitForSelector('input[type="text"]');
            await page.waitForSelector('input[type="password"]');
            await page.fill('input[type="text"]', config.auth.credentials.username);
            await page.fill('input[type="password"]', config.auth.credentials.password);
            await page.click(config.auth.selectors.loginButton);
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
                container.style.margin = '0';
                container.style.padding = '0';
            }
            
            // Reset and force table styles
            table.style.position = 'relative';
            table.style.margin = '0 auto';
            table.style.transform = 'none';
            table.style.top = 'auto';
            table.style.left = 'auto';
            table.style.width = '900px';
            table.style.height = '580px';
            
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

            // Force window scroll to center
            window.scrollTo({
                top: (document.documentElement.scrollHeight - window.innerHeight) / 2,
                left: (document.documentElement.scrollWidth - window.innerWidth) / 2,
                behavior: 'auto'
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
    try {
        // Find and click the Join button for the specific room
        const joinButton = await page.waitForSelector(`[data-room-id="${roomId}"] button:has-text("Join")`, { timeout: 5000 });
        if (!joinButton) {
            console.error('❌ Join button not found for room:', roomId);
            return false;
        }
        
        await joinButton.click();
        console.log('👆 Clicked Join button');
        
        // Wait for game table to appear
        await page.waitForSelector('.game-table-container', { timeout: 10000 });
        console.log('✅ Game table appeared');
        
        // Wait for players to be initialized
        await page.waitForFunction(() => {
            const players = document.querySelectorAll('.player');
            return players.length > 0;
        }, { timeout: 10000 });
        console.log('✅ Players initialized');
        
        // Wait for Start button or confirm game is ready
        const startButton = await page.waitForSelector('button:has-text("Start")', { timeout: 5000 }).catch(() => null);
        if (startButton) {
            console.log('🎮 Found Start button, clicking...');
            await startButton.click();
            await page.waitForTimeout(2000);
        } else {
            console.log('ℹ️ No Start button found, game may already be in progress');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error joining game:', error);
        return false;
    }
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
        await page.waitForTimeout(3000);  // Increased from 1000 to 3000
        
        // Check if we're in a bot's turn
        const isBotTurn = await page.evaluate(() => {
            const activeSpot = document.querySelector('.border-emerald-500');
            if (!activeSpot) return false;
            const playerName = activeSpot.querySelector('p')?.textContent;
            return playerName?.startsWith('Bot');
        });

        if (isBotTurn) {
            console.log('🤖 Waiting for bot to complete their turn...');
            await page.waitForTimeout(5000); // Increased from 2000 to 5000
            return true;
        }

        // Check game state with improved flop detection
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
            const communityCards = document.querySelectorAll('.card');
                
                return {
                activePlayers,
                allPlayersActed,
                currentCommunityCards: communityCards.length,
                playerBets: bets,
                currentBet,
                hasFlop: communityCards.length >= 3
                };
            });
            
        console.log('🌐 Browser: Checking game state:', gameState);

        // Wait longer for flop if all players have acted
        if (gameState.allPlayersActed && !gameState.hasFlop) {
            console.log('🃏 All players have acted, dealing the flop...');
            // Logic to deal the flop
            // This could involve clicking a button or triggering a function in your game logic
            await page.click('button:has-text("DEAL FLOP")'); // Example action to deal the flop
            await page.waitForTimeout(3000); // Wait for the flop to be dealt
        }

        // Add delay between actions
        await page.waitForTimeout(2000); // Added consistent delay between actions

        // Check for action buttons with longer timeouts
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
                await page.waitForTimeout(3000); // Added delay after action
                break;
            }
        }

        if (!validActionFound) {
            console.log('⏳ No valid actions available, waiting...');
            await page.waitForTimeout(3000); // Increased from 1000 to 3000
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

async function handlePlayerActions(page) {
    const actionButtons = await page.$$('button');
    for (const button of actionButtons) {
        const buttonText = await button.evaluate(el => el.textContent.toUpperCase());
        const isDisabled = await button.evaluate(el => el.disabled);

        if (buttonText.includes('CALL') && !isDisabled) {
            console.log('🎮 Calling...');
            await button.click();
            await page.waitForTimeout(2000); // Wait for the action to process
        } else if (buttonText.includes('RAISE') && !isDisabled) {
            console.log('🎮 Raising...');
            await button.click();
            await page.waitForTimeout(2000); // Wait for the action to process
        } else if (buttonText.includes('FOLD') && !isDisabled) {
            console.log('🎮 Folding...');
            await button.click();
            await page.waitForTimeout(2000); // Wait for the action to process
        }
    }

    // Check if all players have acted and deal the flop if so
    const gameState = await page.evaluate(() => {
        const playerSpots = document.querySelectorAll('[data-component-file="PlayerSpot.tsx"]');
        const bets = Array.from(playerSpots).map(spot => {
            const betText = spot.querySelector('.text-amber-400')?.textContent;
            return betText ? parseFloat(betText.replace(/[^0-9.]/g, '')) : 0;
        });

        const currentBet = Math.max(...bets);
        const allPlayersActed = bets.every(bet => bet === currentBet || bet === 0);
        return { allPlayersActed };
    });

    if (gameState.allPlayersActed) {
        console.log('🃏 All players have acted, dealing the flop...');
        // Logic to deal the flop
        // This could involve clicking a button or triggering a function in your game logic
    } else {
        console.log('⏳ Waiting for all players to act...');
        await page.waitForTimeout(3000); // Wait before checking again
        await handlePlayerActions(page); // Recursively call to handle actions again
    }
}

async function runTest() {
    console.log('🚀 Starting automated game test...');
    
    const { browser, context, page } = await initializeBrowser();
    
    try {
        await page.goto('http://localhost:8080/');
        console.log('📸 Taking initial page screenshot...');
        
        // Add more detailed page content logging
        const pageContent = await page.evaluate(() => {
            console.log('Document title:', document.title);
            console.log('All inputs:', document.querySelectorAll('input').length);
            console.log('All buttons:', document.querySelectorAll('button').length);
            console.log('Root content:', document.getElementById('root')?.innerHTML);
            return {
                title: document.title,
                inputs: Array.from(document.querySelectorAll('input')).map(input => ({
                    type: input.type,
                    id: input.id,
                    className: input.className
                })),
                buttons: Array.from(document.querySelectorAll('button')).map(button => ({
                    text: button.textContent,
                    className: button.className
                }))
            };
        });
        console.log('📄 Detailed page content:', JSON.stringify(pageContent, null, 2));
        
        // Continue with login attempt
        await login(page);
        await checkAndFixTablePosition(page);
        const { state: loginState } = await captureScreenshot(page, 'after_login');
        console.log('Login state:', loginState);
        
        // Join game with multiple position checks
        await page.waitForTimeout(2000);
        await checkAndFixTablePosition(page);
        
        // Find an available room
        const availableRoom = await page.evaluate(() => {
            const joinButtons = Array.from(document.querySelectorAll('button')).filter(btn => btn.textContent === 'Join');
            if (joinButtons.length > 0) {
                const roomElement = joinButtons[0].closest('[data-room-id]');
                return roomElement ? roomElement.getAttribute('data-room-id') : null;
            }
            return null;
        });
        
        if (!availableRoom) {
            console.error('❌ No available rooms found');
            return;
        }
        
        console.log('🎮 Joining room:', availableRoom);
        const gameStarted = await joinGame(page, availableRoom);
        await page.waitForTimeout(2000);
        await checkAndFixTablePosition(page);
        const { state: joinState } = await captureScreenshot(page, 'after_join');
        console.log('Join state:', joinState);
        
        // Verify table state after joining
        const tableState = await checkVisualState(page);
        if (!tableState.tableVisible || !tableState.tableCentered) {
            console.log('🔄 Fixing table position after join...');
            await checkAndFixTablePosition(page);
            await page.waitForTimeout(1500);
            await captureScreenshot(page, 'table_position_fixed_after_join');
        }
        
        // Only proceed if game started successfully
        if (gameStarted) {
            await page.waitForTimeout(2000);
            await checkAndFixTablePosition(page);
            
            const { action } = await analyzeScreenshotAndDecideAction(page, 'game_started');
            if (action !== 'PLAY_TURN') {
                // Position check before starting new hand
                await checkAndFixTablePosition(page);
                await startNewHand(page);
                await page.waitForTimeout(2000);
                await checkAndFixTablePosition(page);
                
                const { state: gameState } = await captureScreenshot(page, 'game_started');
                console.log('Game state:', gameState);
                
                // Final verification of all elements
                const finalState = await checkVisualState(page);
                if (!finalState.cardsVisible || !finalState.playersVisible || !finalState.potVisible) {
                    console.error('⚠️ Some game elements are not visible:', finalState);
                    // One last attempt to fix position
                    await checkAndFixTablePosition(page);
                }
            } else {
                console.log('✅ Game already in progress, verifying position...');
                await checkAndFixTablePosition(page);
                const { state: currentState } = await captureScreenshot(page, 'game_in_progress');
                console.log('Current state:', currentState);
            }

            // After starting a new hand, handle player actions
            await handlePlayerActions(page);

            // Check if flop is dealt
            const communityCards = await page.evaluate(() => {
                return document.querySelectorAll('.community-cards .card').length;
            });
            if (communityCards >= 3) {
                console.log('✅ Flop has been dealt successfully.');
            } else {
                console.log('⚠️ Flop has not been dealt yet.');
            }
        }

        // Final position check and screenshot
        await checkAndFixTablePosition(page);
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