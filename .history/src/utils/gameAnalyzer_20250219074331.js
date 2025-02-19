export async function analyzeGameState(page) {
    try {
        // Find game phase
        const phaseElement = await page.$('[data-testid="game-phase"], .game-status');
        const phase = phaseElement ? await phaseElement.evaluate(el => el.textContent) : 'Not found';

        // Find pot size
        const potElement = await page.$('[data-testid="pot-size"], .total-pot');
        const potSize = potElement ? await potElement.evaluate(el => {
            const text = el.textContent;
            return parseInt(text.replace(/[^0-9]/g, '')) || 0;
        }) : 0;

        // Find current bet
        const betElement = await page.$('[data-testid="current-bet"], .bet-size');
        const currentBet = betElement ? await betElement.evaluate(el => {
            const text = el.textContent;
            return parseInt(text.replace(/[^0-9]/g, '')) || 0;
        }) : 0;

        // Find active player
        const activeElement = await page.$('[data-testid="active-player"], .turn-player');
        const activePlayer = activeElement ? await activeElement.evaluate(el => el.getAttribute('data-player-id')) : null;

        // Find community cards
        const communityCards = await page.$$('[data-testid="community-card"], .poker-community-card');
        const communityCardsCount = communityCards.length;

        // Find player positions
        const playerElements = await page.$$('[data-testid="player"]');
        const playerPositions = [];
        
        for (const element of playerElements) {
            const position = await element.evaluate(el => {
                const rect = el.getBoundingClientRect();
                return {
                    x: rect.x,
                    y: rect.y
                };
            });
            playerPositions.push(position);
        }

        // Find action buttons
        const actionButtons = await page.$$('[data-testid^="action-"]');
        const availableActions = await Promise.all(
            actionButtons.map(async button => {
                const type = await button.evaluate(el => el.getAttribute('data-testid').replace('action-', ''));
                const amount = await button.evaluate(el => {
                    const text = el.textContent;
                    const match = text.match(/\$(\d+)/);
                    return match ? parseInt(match[1]) : null;
                });
                return { type, amount };
            })
        );

        // Check for error messages
        const errorElement = await page.$('[data-testid="error"], .error-popup');
        const error = errorElement ? await errorElement.evaluate(el => el.textContent) : null;

        return {
            phase,
            potSize,
            currentBet,
            activePlayer,
            communityCardsCount,
            playerPositions: playerPositions.length,
            availableActions,
            error
        };
    } catch (error) {
        console.error('Error analyzing game state:', error);
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