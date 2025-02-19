async function checkAndFixTablePosition(page) {
    const tablePosition = await page.evaluate(() => {
        const table = document.querySelector('.game-table-container');
        if (!table) return null;

        const rect = table.getBoundingClientRect();
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        // Check if table is fully visible
        const isFullyVisible = 
            rect.left >= 0 &&
            rect.top >= 0 &&
            rect.right <= viewport.width &&
            rect.bottom <= viewport.height;

        // If not fully visible, center it
        if (!isFullyVisible) {
            table.style.position = 'fixed';
            table.style.top = '50%';
            table.style.left = '50%';
            table.style.transform = 'translate(-50%, -50%)';
            
            // Force recalculation of position
            table.style.display = 'none';
            table.offsetHeight; // Force reflow
            table.style.display = '';
            
            // Take a screenshot after centering
            return {
                wasFixed: true,
                newRect: table.getBoundingClientRect()
            };
        }

        return { wasFixed: false, rect };
    });

    if (tablePosition && tablePosition.wasFixed) {
        console.log('📏 Fixed table position:', tablePosition.newRect);
        // Take a screenshot to verify the fix
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        await page.screenshot({ 
            path: `Screenshots/table_position_fixed_${timestamp}.png`,
            fullPage: true 
        });
    }

    return tablePosition;
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
            const { action, button, errors, screenshot } = await analyzeScreenshotAndDecideAction(page);
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

            // ... existing code ...
        } catch (error) {
            console.error(`🚨 Error joining room: ${roomId} (Attempt ${joinAttempts + 1}/${MAX_JOIN_ATTEMPTS})`, error);
            await page.waitForTimeout(JOIN_TIMEOUT / MAX_JOIN_ATTEMPTS);
        }
    }

    throw new GameStateError('Max join attempts reached', { roomId });
} 