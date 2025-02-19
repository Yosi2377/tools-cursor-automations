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

// Error logging
export function logError(error, context = {}) {
    const errorLog = {
        timestamp: new Date().toISOString(),
        name: error.name,
        message: error.message,
        type: error.type,
        details: error.details,
        context,
        stack: error.stack
    };

    console.error('🚨 Error occurred:', JSON.stringify(errorLog, null, 2));
    return errorLog;
}

// Retry mechanism for async operations
export async function retry(operation, maxAttempts = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
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

// Recovery strategies
export async function recoverFromError(error, page) {
    console.log('🔄 Attempting to recover from error:', error.message);
    
    switch(error.type) {
        case 'CONNECTION_ERROR':
            return await handleConnectionError(page);
        case 'GAME_STATE_ERROR':
            return await handleGameStateError(page);
        case 'PLAYER_ACTION_ERROR':
            return await handlePlayerActionError(page);
        default:
            return await handleUnknownError(page);
    }
}

async function handleConnectionError(page) {
    try {
        console.log('🔌 Handling connection error...');
        
        // Check if page is still responsive
        const isResponsive = await page.evaluate(() => document.readyState).catch(() => false);
        if (!isResponsive) {
            console.log('📄 Page not responsive, reloading...');
            await page.reload({ waitUntil: 'networkidle' });
        }
        
        // Check if we need to re-login
        const needsLogin = await page.$('input[type="text"]');
        if (needsLogin) {
            console.log('🔑 Re-logging in...');
            await page.fill('input[type="text"]', 'bigbaga123');
            await page.fill('input[type="password"]', '121212');
            await page.click('button[type="submit"]');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to recover from connection error:', error);
        return false;
    }
}

async function handleGameStateError(page) {
    try {
        console.log('🎮 Handling game state error...');
        
        // Try to close any error popups
        const closeButtons = await page.$$('button:has-text("Close"), button:has-text("×")');
        for (const button of closeButtons) {
            await button.click().catch(() => {});
        }
        
        // Try to start new hand if possible
        const startButton = await page.$('button:has-text("start new hand")');
        if (startButton) {
            console.log('🃏 Starting new hand...');
            await startButton.click();
            return true;
        }
        
        // If can't start new hand, try to rejoin
        const leaveButton = await page.$('button:has-text("Leave Room")');
        if (leaveButton) {
            console.log('👋 Leaving room...');
            await leaveButton.click();
            await page.waitForTimeout(1000);
            
            const joinButton = await page.$('button:has-text("JOIN")');
            if (joinButton) {
                console.log('🎲 Rejoining game...');
                await joinButton.click();
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('❌ Failed to recover from game state error:', error);
        return false;
    }
}

async function handlePlayerActionError(page) {
    try {
        console.log('👤 Handling player action error...');
        
        // Check if it's still our turn
        const activePlayer = await page.$('[data-testid="active-player"]');
        if (!activePlayer) {
            console.log('✅ No longer our turn, continuing...');
            return true;
        }
        
        // Try to find any available action button
        const actionButtons = await page.$$('.action-button:not([disabled])');
        if (actionButtons.length > 0) {
            console.log('🎯 Found available action, attempting...');
            await actionButtons[0].click();
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('❌ Failed to recover from player action error:', error);
        return false;
    }
}

async function handleUnknownError(page) {
    try {
        console.log('❓ Handling unknown error...');
        
        // Take screenshot of error state
        await page.screenshot({ 
            path: `Screenshots/error_state_${Date.now()}.png`,
            fullPage: true 
        });
        
        // Try basic recovery: reload page
        await page.reload({ waitUntil: 'networkidle' });
        
        // Check if we need to re-login
        const needsLogin = await page.$('input[type="text"]');
        if (needsLogin) {
            await handleConnectionError(page);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to recover from unknown error:', error);
        return false;
    }
} 