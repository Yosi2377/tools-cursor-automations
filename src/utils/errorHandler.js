class GameError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'GameError';
        this.details = details;
    }
}

class ConnectionError extends GameError {
    constructor(message, details = {}) {
        super(message, details);
        this.name = 'ConnectionError';
    }
}

class GameStateError extends GameError {
    constructor(message, details = {}) {
        super(message, details);
        this.name = 'GameStateError';
    }
}

class PlayerActionError extends GameError {
    constructor(message, details = {}) {
        super(message, details);
        this.name = 'PlayerActionError';
    }
}

class RoundStuckError extends GameError {
    constructor(message, details = {}) {
        super(message, details);
        this.name = 'RoundStuckError';
    }
}

async function retry(fn, maxAttempts = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, error.message);
            
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError;
}

function logError(error, context = {}) {
    const errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        details: error.details || {},
        context
    };
    
    console.error('🚨 Error logged:', JSON.stringify(errorDetails, null, 2));
}

async function recoverFromError(error, page) {
    console.log('🔄 Attempting to recover from error:', error.name);
    
    if (error instanceof ConnectionError) {
        await page.reload({ waitUntil: 'networkidle' });
        return true;
    }
    
    if (error instanceof GameStateError) {
        // Take a screenshot of the error state
        await page.screenshot({ 
            path: `Screenshots/recovery_${Date.now()}.png`,
            fullPage: true 
        });
        
        // Try to reset game state
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        await page.reload({ waitUntil: 'networkidle' });
        return true;
    }
    
    return false;
}

export {
    GameError,
    ConnectionError,
    GameStateError,
    PlayerActionError,
    RoundStuckError,
    retry,
    logError,
    recoverFromError
}; 