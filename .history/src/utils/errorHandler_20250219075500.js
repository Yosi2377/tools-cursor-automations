// Game-specific error types
export class GameError extends Error {
    constructor(message, type, details = {}) {
        super(message);
        this.name = 'GameError';
        this.type = type;
        this.details = details;
        this.timestamp = new Date();
    }
}

export class ConnectionError extends GameError {
    constructor(message, details = {}) {
        super(message, 'CONNECTION_ERROR', details);
        this.name = 'ConnectionError';
    }
}

export class GameStateError extends GameError {
    constructor(message, details = {}) {
        super(message, 'GAME_STATE_ERROR', details);
        this.name = 'GameStateError';
    }
}

export class PlayerActionError extends GameError {
    constructor(message, details = {}) {
        super(message, 'PLAYER_ACTION_ERROR', details);
        this.name = 'PlayerActionError';
    }
}

// Add new error type for stuck rounds
export class RoundStuckError extends GameError {
    constructor(message, details = {}) {
        super(message, 'ROUND_STUCK_ERROR', details);
        this.name = 'RoundStuckError';
    }
}

// Error tracking
const errorStats = {
    counts: {},
    lastOccurrence: {},
    recoveryAttempts: {},
    successfulRecoveries: {}
};

// Enhanced error logging with stats
export function logError(error, context = {}) {
    const errorType = error.type || 'UNKNOWN';
    
    // Update error stats
    errorStats.counts[errorType] = (errorStats.counts[errorType] || 0) + 1;
    errorStats.lastOccurrence[errorType] = new Date();
    
    const errorLog = {
        timestamp: new Date().toISOString(),
        name: error.name,
        message: error.message,
        type: errorType,
        details: error.details,
        context,
        stack: error.stack,
        stats: {
            totalOccurrences: errorStats.counts[errorType],
            recoveryAttempts: errorStats.recoveryAttempts[errorType] || 0,
            successfulRecoveries: errorStats.successfulRecoveries[errorType] || 0
        }
    };

    console.error('🚨 Error occurred:', JSON.stringify(errorLog, null, 2));
    return errorLog;
}

// Enhanced retry with progressive delays
export async function retry(operation, maxAttempts = 3, initialDelay = 1000) {
    let lastError;
    let delay = initialDelay;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await operation();
            console.log(`✅ Operation succeeded on attempt ${attempt}/${maxAttempts}`);
            return result;
        } catch (error) {
            lastError = error;
            console.warn(`⚠️ Attempt ${attempt}/${maxAttempts} failed:`, error.message);
            
            if (attempt < maxAttempts) {
                console.log(`🔄 Retrying in ${delay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }
        }
    }
    
    throw lastError;
}

// Enhanced recovery strategies
export async function recoverFromError(error, page) {
    const errorType = error.type || 'UNKNOWN';
    errorStats.recoveryAttempts[errorType] = (errorStats.recoveryAttempts[errorType] || 0) + 1;
    
    console.log(`🔄 Attempting to recover from ${errorType} error (Attempt #${errorStats.recoveryAttempts[errorType]}):`);
    console.log(`   Message: ${error.message}`);
    
    let recovered = false;
    
    try {
        switch(error.type) {
            case 'CONNECTION_ERROR':
                recovered = await handleConnectionError(page);
                break;
            case 'GAME_STATE_ERROR':
                recovered = await handleGameStateError(page);
                break;
            case 'PLAYER_ACTION_ERROR':
                recovered = await handlePlayerActionError(page);
                break;
            case 'ROUND_STUCK_ERROR':
                recovered = await handleStuckRound(page);
                break;
            default:
                recovered = await handleUnknownError(page);
        }
        
        if (recovered) {
            errorStats.successfulRecoveries[errorType] = (errorStats.successfulRecoveries[errorType] || 0) + 1;
            console.log(`✅ Successfully recovered from ${errorType} error`);
        } else {
            console.error(`❌ Failed to recover from ${errorType} error`);
        }
        
        return recovered;
    } catch (recoveryError) {
        console.error('❌ Error during recovery attempt:', recoveryError);
        return false;
    }
}

// Enhanced connection error handling
async function handleConnectionError(page) {
    console.log('🔌 Handling connection error...');
    
    try {
        // Check network connectivity first
        const isOnline = await page.evaluate(() => navigator.onLine);
        if (!isOnline) {
            console.log('📡 Waiting for network connection...');
            await page.waitForFunction(() => navigator.onLine, { timeout: 30000 });
        }
        
        // Check if page is responsive
        const isResponsive = await page.evaluate(() => document.readyState).catch(() => false);
        if (!isResponsive) {
            console.log('📄 Page not responsive, reloading...');
            await page.reload({ waitUntil: 'networkidle' });
        }
        
        // Check for login form
        const needsLogin = await page.$('input[type="text"]');
        if (needsLogin) {
            console.log('🔑 Re-logging in...');
            await retry(async () => {
                await page.fill('input[type="text"]', 'bigbaga123');
                await page.fill('input[type="password"]', '121212');
                await page.click('button[type="submit"]');
                await page.waitForSelector('button:has-text("JOIN")', { timeout: 5000 });
            }, 3, 2000);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to recover from connection error:', error);
        return false;
    }
}

// Enhanced game state error handling
async function handleGameStateError(page) {
    console.log('🎮 Handling game state error...');
    
    try {
        // First try to analyze current game state
        const gameState = await retry(async () => {
            const state = await page.evaluate(() => {
                return {
                    isTableVisible: !!document.querySelector('.game-table-container'),
                    hasErrors: !!document.querySelector('.error, .error-popup'),
                    isLoading: !!document.querySelector('.loading, .spinner'),
                    playerCount: document.querySelectorAll('[data-testid="player"]').length
                };
            });
            return state;
        });
        
        console.log('📊 Current game state:', gameState);
        
        // Close any error popups
        const closeButtons = await page.$$('button:has-text("Close"), button:has-text("×")');
        for (const button of closeButtons) {
            await button.click().catch(() => {});
            await page.waitForTimeout(500);
        }
        
        // Try to start new hand if possible
        const startButton = await page.$('button:has-text("start new hand")');
        if (startButton) {
            console.log('🃏 Starting new hand...');
            await startButton.click();
            await page.waitForTimeout(2000);
            
            // Verify game started
            const newState = await page.evaluate(() => {
                return {
                    hasCards: !!document.querySelector('.card'),
                    hasPlayers: !!document.querySelector('[data-testid="player"]')
                };
            });
            
            if (newState.hasCards && newState.hasPlayers) {
                return true;
            }
        }
        
        // If can't start new hand, try to rejoin
        const leaveButton = await page.$('button:has-text("Leave Room")');
        if (leaveButton) {
            console.log('👋 Leaving room...');
            await leaveButton.click();
            await page.waitForTimeout(1000);
            
            // Try to join a new room
            return await retry(async () => {
                const joinButton = await page.$('button:has-text("JOIN")');
                if (joinButton) {
                    console.log('🎲 Joining new room...');
                    await joinButton.click();
                    await page.waitForTimeout(2000);
                    return true;
                }
                return false;
            }, 3, 2000);
        }
        
        return false;
    } catch (error) {
        console.error('❌ Failed to recover from game state error:', error);
        return false;
    }
}

// Enhanced player action error handling
async function handlePlayerActionError(page) {
    console.log('👤 Handling player action error...');
    
    try {
        // First check if it's still our turn
        const activePlayer = await page.$('[data-testid="active-player"]');
        if (!activePlayer) {
            console.log('✅ No longer our turn, continuing...');
            return true;
        }
        
        // Try to find any available action button
        return await retry(async () => {
            const actionButtons = await page.$$('.action-button:not([disabled])');
            if (actionButtons.length > 0) {
                console.log('🎯 Found available action, attempting...');
                await actionButtons[0].click();
                await page.waitForTimeout(1000);
                
                // Verify action was successful
                const stillActive = await page.$('[data-testid="active-player"]');
                return !stillActive;
            }
            throw new Error('No available actions');
        }, 3, 1000);
    } catch (error) {
        console.error('❌ Failed to recover from player action error:', error);
        return false;
    }
}

// Enhanced unknown error handling
async function handleUnknownError(page) {
    console.log('❓ Handling unknown error...');
    
    try {
        // Take screenshot of error state
        await page.screenshot({ 
            path: `Screenshots/unknown_error_${Date.now()}.png`,
            fullPage: true 
        });
        
        // Try to gather more information about the error
        const errorInfo = await page.evaluate(() => {
            const errors = [];
            // Check console errors
            const errorLogs = window.console.error;
            if (errorLogs && errorLogs.length) {
                errors.push(...errorLogs);
            }
            // Check error boundaries
            const errorBoundaries = document.querySelectorAll('[data-error-boundary]');
            errorBoundaries.forEach(boundary => {
                errors.push(boundary.textContent);
            });
            return errors;
        });
        
        if (errorInfo.length > 0) {
            console.log('📝 Found error information:', errorInfo);
        }
        
        // Try basic recovery: reload page
        await page.reload({ waitUntil: 'networkidle' });
        
        // Check if we need to re-login
        const needsLogin = await page.$('input[type="text"]');
        if (needsLogin) {
            return await handleConnectionError(page);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to recover from unknown error:', error);
        return false;
    }
}

// Add new handler for stuck rounds
async function handleStuckRound(page) {
    console.log('🎮 Handling stuck round...');
    
    try {
        // First try: Check if we can force end the round
        const actionButtons = await page.$$('.action-button:not([disabled])');
        if (actionButtons.length > 0) {
            console.log('👆 Attempting to force round end with available action...');
            await actionButtons[0].click();
            await page.waitForTimeout(2000);
            
            // Check if round ended
            const newActionButtons = await page.$$('.action-button:not([disabled])');
            if (newActionButtons.length === 0) {
                console.log('✅ Successfully forced round end');
                return true;
            }
        }
        
        // Second try: Check if we can start new hand
        const startButton = await page.$('button:has-text("start new hand")');
        if (startButton) {
            console.log('🃏 Attempting to start new hand...');
            await startButton.click();
            await page.waitForTimeout(2000);
            
            // Verify new hand started
            const gameState = await page.evaluate(() => ({
                hasCards: !!document.querySelector('.card'),
                hasPlayers: !!document.querySelector('[data-testid="player"]'),
                hasActions: !!document.querySelector('.action-button:not([disabled])')
            }));
            
            if (gameState.hasCards && gameState.hasPlayers) {
                console.log('✅ Successfully started new hand');
                return true;
            }
        }
        
        // Third try: Leave and rejoin game
        const leaveButton = await page.$('button:has-text("Leave Room")');
        if (leaveButton) {
            console.log('👋 Leaving stuck game...');
            await leaveButton.click();
            await page.waitForTimeout(2000);
            
            return await retry(async () => {
                const joinButton = await page.$('button:has-text("JOIN")');
                if (joinButton) {
                    console.log('🎲 Rejoining game...');
                    await joinButton.click();
                    await page.waitForTimeout(2000);
                    
                    // Verify successful rejoin
                    const gameState = await page.evaluate(() => ({
                        isInGame: !!document.querySelector('.game-table-container'),
                        hasPlayers: !!document.querySelector('[data-testid="player"]')
                    }));
                    
                    return gameState.isInGame && gameState.hasPlayers;
                }
                return false;
            }, 3, 2000);
        }
        
        // Fourth try: Refresh page as last resort
        console.log('🔄 Attempting page refresh...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        // Check if we need to re-login
        const needsLogin = await page.$('input[type="text"]');
        if (needsLogin) {
            return await handleConnectionError(page);
        }
        
        return false;
    } catch (error) {
        console.error('❌ Failed to recover from stuck round:', error);
        return false;
    }
} 