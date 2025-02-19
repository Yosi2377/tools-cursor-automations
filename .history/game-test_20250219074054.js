import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function analyzeScreenshot(page, screenshot) {
  try {
    // Check if the page has any error messages
    const errorElements = await page.$$('.error, .alert, .alert-danger');
    if (errorElements.length > 0) {
      console.error('❌ Error messages found on page!');
      for (const error of errorElements) {
        const text = await error.textContent();
        console.error(`   Error: ${text}`);
      }
    }

    // Check if important elements are visible using the correct selectors
    const gameTable = await page.$('.relative.w-full.h-full.flex.items-center.justify-center');
    if (!gameTable) {
      console.warn('⚠️ Game table not visible in screenshot!');
    }

    // Check for loading indicators
    const loadingElements = await page.$$('.loading, .spinner');
    if (loadingElements.length > 0) {
      console.warn('⚠️ Loading indicators found - game might be stuck!');
    }

    // Check for player cards using the correct selector
    const playerCards = await page.$$('.rounded-lg.shadow-lg.flex.flex-col');
    console.log(`ℹ️ Found ${playerCards.length} cards on table`);
    
    // Log card positions for debugging
    for (const card of playerCards) {
      const box = await card.boundingBox();
      if (box) {
        console.log(`   Card at position: x:${box.x}, y:${box.y}`);
      }
    }

    // Check for player positions using the correct selector
    const players = await page.$$('.w-full.h-full.flex.items-center.justify-center');
    console.log(`ℹ️ Found ${players.length} player positions`);
    
    // Log player positions for debugging
    for (const player of players) {
      const box = await player.boundingBox();
      if (box) {
        console.log(`   Player position at: x:${box.x}, y:${box.y}`);
      }
    }

    return {
      hasErrors: errorElements.length > 0,
      isTableVisible: !!gameTable,
      isLoading: loadingElements.length > 0,
      numCards: playerCards.length,
      numPlayers: players.length - 1 // Subtract 1 because one element is the main container
    };
  } catch (error) {
    console.error('Error analyzing screenshot:', error);
    return null;
  }
}

async function analyzeGameState(page) {
  try {
    // Enhanced game phase detection with more selectors
    const phaseSelectors = [
      '.game-phase', '.phase', '.betting-round', 
      '[data-testid="game-phase"]', '.game-status',
      '.current-phase', '.poker-phase'
    ];
    let gamePhase = 'Not found';
    for (const selector of phaseSelectors) {
      const element = await page.$(selector);
      if (element) {
        gamePhase = await element.textContent();
        break;
      }
    }
    console.log(`🎯 Current game phase: ${gamePhase}`);

    // Enhanced pot size detection
    const potSelectors = [
      '.pot', '.pot-size', '[data-testid="pot-size"]',
      '.total-pot', '.current-pot', '.poker-pot'
    ];
    let potSize = 'Not found';
    for (const selector of potSelectors) {
      const element = await page.$(selector);
      if (element) {
        potSize = await element.textContent();
        break;
      }
    }
    console.log(`💰 Pot size: ${potSize}`);

    // Enhanced current bet detection
    const betSelectors = [
      '.current-bet', '.bet-amount', '[data-testid="current-bet"]',
      '.bet-size', '.poker-bet', '.active-bet'
    ];
    let currentBet = 'Not found';
    for (const selector of betSelectors) {
      const element = await page.$(selector);
      if (element) {
        currentBet = await element.textContent();
        break;
      }
    }
    console.log(`🎲 Current bet: ${currentBet}`);

    // Enhanced active player detection
    const playerSelectors = [
      '.active-player', '.current-player', '[data-testid="active-player"]',
      '.turn-player', '.poker-active-player', '.player-turn'
    ];
    let activePlayer = 'Not found';
    for (const selector of playerSelectors) {
      const element = await page.$(selector);
      if (element) {
        activePlayer = await element.textContent();
        break;
      }
    }
    console.log(`👤 Active player: ${activePlayer}`);

    // Enhanced community cards detection
    const cardSelectors = [
      '.community-card', '.board-card', '.flop-card', '.turn-card', '.river-card',
      '[data-testid="community-card"]', '.poker-community-card'
    ];
    const communityCards = await page.$$(cardSelectors.join(', '));
    console.log(`🎴 Community cards: ${communityCards.length}`);
    
    // Enhanced player action detection
    const playerElements = await page.$$('.player, [data-testid="player"]');
    let playersActed = 0;
    for (const player of playerElements) {
      const hasActed = await player.$('.has-acted, .player-acted, [data-testid="player-acted"]');
      if (hasActed) playersActed++;
    }
    console.log(`👥 Players acted: ${playersActed}/${playerElements.length}`);

    // Check betting round completion
    const allPlayersActed = playersActed === playerElements.length;
    console.log(`${allPlayersActed ? '✅' : '⏳'} Betting round ${allPlayersActed ? 'completed' : 'in progress'}`);

    return {
      phase: gamePhase,
      potSize,
      currentBet,
      activePlayer,
      communityCardsCount: communityCards.length,
      playersActed,
      totalPlayers: playerElements.length,
      bettingRoundComplete: allPlayersActed
    };
  } catch (error) {
    console.error('Error analyzing game state:', error);
    return null;
  }
}

async function waitForGameTable(page) {
  try {
    // Wait for the main game container
    const mainContainer = await page.waitForSelector(
      '.relative.w-full.h-full.flex.items-center.justify-center',
      { timeout: 5000, state: 'visible' }
    );
    
    if (mainContainer) {
      const box = await mainContainer.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        console.log(`🎲 Game table found at position: x:${box.x}, y:${box.y}, size: ${box.width}x${box.height}`);
        
        // Wait for at least one player card to appear
        const cards = await page.$$('.rounded-lg.shadow-lg.flex.flex-col');
        console.log(`Found ${cards.length} cards on the table`);
        
        // Wait for player positions
        const players = await page.$$('.w-full.h-full.flex.items-center.justify-center');
        console.log(`Found ${players.length - 1} player positions`); // Subtract 1 for main container
        
        return true;
      }
    }
    
    console.log('⚠️ Game table container found but not properly sized');
    return false;
  } catch (error) {
    console.log('⚠️ Error while waiting for game table:', error.message);
    return false;
  }
}

async function takeScreenshot(page, name) {
  try {
    // Wait for any animations to complete
    await page.waitForTimeout(1000);

    // Try to find the game container with the correct selector
    const gameContainer = await page.$('.relative.w-full.h-full.flex.items-center.justify-center');
    
    let screenshot;
    if (gameContainer) {
      // If game container found, take screenshot of just that element
      screenshot = await gameContainer.screenshot({
        type: 'png',
        timeout: 5000
      });
      console.log('📸 Captured game container screenshot');
    } else {
      // Otherwise take full page screenshot
      screenshot = await page.screenshot({ 
        fullPage: true,
        type: 'png',
        timeout: 5000
      });
      console.log('📸 Captured full page screenshot');
    }

    const base64Image = screenshot.toString('base64');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join('Screenshots', `${name}_${timestamp}.txt`);
    
    fs.writeFileSync(filename, base64Image);
    console.log(`Screenshot saved: ${filename}`);

    // Analyze the current state
    console.log('\n🔍 Analyzing game state...');
    const analysis = await analyzeScreenshot(page, screenshot);
    const gameState = await analyzeGameState(page);
    
    if (analysis) {
      console.log('\n📊 Game State Summary:');
      console.log(`   ${analysis.hasErrors ? '❌' : '✅'} Error messages`);
      console.log(`   ${analysis.isTableVisible ? '✅' : '❌'} Game table visible`);
      console.log(`   ${analysis.isLoading ? '⚠️' : '✅'} Loading state`);
      console.log(`   🎴 ${analysis.numCards} cards`);
      console.log(`   🎮 ${analysis.numPlayers} players\n`);
    }

    if (gameState) {
      console.log('\n🎮 Detailed Game State:');
      console.log(`   🎯 Phase: ${gameState.phase}`);
      console.log(`   💰 Pot: ${gameState.potSize}`);
      console.log(`   🎲 Current bet: ${gameState.currentBet}`);
      console.log(`   👤 Active player: ${gameState.activePlayer}`);
      console.log(`   🎴 Community cards: ${gameState.communityCardsCount}`);
      console.log(`   👥 Players acted: ${gameState.playersActed}/${gameState.totalPlayers}`);
      console.log(`   ${gameState.bettingRoundComplete ? '✅' : '⏳'} Round status\n`);
    }

    return base64Image;
  } catch (error) {
    console.error('❌ Error taking screenshot:', error);
    return null;
  }
}

async function waitForCommunityCards(page) {
  try {
    // Try multiple possible selectors for community cards
    const cardSelectors = ['.community-cards', '.flop-cards', '.board-cards'];
    for (const selector of cardSelectors) {
      const cards = await page.$(selector);
      if (cards) {
        console.log(`🎴 Found community cards with selector: ${selector}`);
        return true;
      }
    }
    console.log('⚠️ No community cards found');
    return false;
  } catch (error) {
    console.log('⚠️ Error checking for community cards:', error.message);
    return false;
  }
}

async function handlePlayerTurn(page) {
  try {
    // Wait for action buttons to be available
    const actionButtons = await page.$$('.action-button:not([disabled])');
    if (actionButtons.length === 0) {
      console.log('⚠️ No action buttons available');
      return;
    }

    // Get current bet amount
    const betAmount = await page.$eval('.current-bet', el => parseInt(el.textContent) || 0);
    console.log(`💰 Current bet: ${betAmount}`);

    // Choose action based on bet amount
    if (betAmount <= 100) {
      const callButton = actionButtons.find(button => button.textContent.includes('Call'));
      if (callButton) {
        await callButton.click();
        console.log('✅ Clicked Call button');
      }
    } else {
      const foldButton = actionButtons.find(button => button.textContent.includes('Fold'));
      if (foldButton) {
        await foldButton.click();
        console.log('✅ Clicked Fold button');
      }
    }
  } catch (error) {
    console.log('⚠️ Error handling player turn:', error.message);
  }
}

async function handleStuckGame(page) {
  try {
    console.log('🔄 Attempting to recover from stuck game state...');
    
    // Take screenshot of stuck state
    await takeScreenshot(page, 'stuck_game_state');
    
    // First try: Check for any error popups and close them
    const closeButtons = await page.$$('button:has-text("Close"), button:has-text("×"), .close-button');
    if (closeButtons.length > 0) {
      console.log('🚫 Closing error popups...');
      for (const button of closeButtons) {
        await button.click();
        await page.waitForTimeout(500);
      }
      // Check if game resumed
      const gameState = await analyzeGameState(page);
      if (gameState && gameState.playersActed > 0) {
        console.log('✅ Game resumed after closing popups');
        return true;
      }
    }
    
    // Second try: Check if we can force start a new hand
    const startNewHandButton = await page.$('button:has-text("start new hand")');
    if (startNewHandButton) {
      console.log('🃏 Forcing new hand start...');
      await startNewHandButton.click();
      await page.waitForTimeout(2000);
      const gameState = await analyzeGameState(page);
      if (gameState && gameState.phase !== 'Not found') {
        console.log('✅ Successfully started new hand');
        return true;
      }
    }
    
    // Third try: Check if we can leave the room
    const leaveButton = await page.$('button:has-text("Leave Room")');
    if (leaveButton) {
      console.log('👋 Leaving stuck room...');
      await leaveButton.click();
      await page.waitForTimeout(2000);
      
      // Try to join a new room
      const joinButton = await page.$('button:has-text("JOIN")');
      if (joinButton) {
        console.log('🎲 Joining new room...');
        await joinButton.click();
        await page.waitForTimeout(2000);
        
        // Start new hand
        const startButton = await page.$('button:has-text("start new hand")');
        if (startButton) {
          console.log('🃏 Starting fresh hand...');
          await startButton.click();
          await page.waitForTimeout(2000);
          return true;
        }
      }
    }
    
    // Fourth try: If we can't leave/rejoin, try refreshing the page
    console.log('🔄 Refreshing page...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Re-login if needed
    const loginInput = await page.$('input[type="text"]');
    if (loginInput) {
      console.log('🔑 Re-logging in...');
      await page.fill('input[type="text"]', 'bigbaga123');
      await page.fill('input[type="password"]', '121212');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      // Try to join game again
      const joinButton = await page.$('button:has-text("JOIN")');
      if (joinButton) {
        await joinButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Successfully rejoined after refresh');
        return true;
      }
    }
    
    // If all recovery attempts failed
    console.log('❌ All recovery attempts failed');
    return false;
  } catch (error) {
    console.error('❌ Error handling stuck game:', error);
    return false;
  }
}

async function runTest() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized', '--no-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  
  const page = await context.newPage();

  // Update the styles section in runTest function
  await page.addStyleTag({
    content: `
      /* Login form styles */
      .login-container, .auth-container, form {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: auto !important;
        max-width: 400px !important;
        padding: 20px !important;
        background: rgba(255, 255, 255, 0.1) !important;
        border-radius: 10px !important;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.3) !important;
        z-index: 10000 !important;
      }

      /* Game table styles */
      .game-table, .poker-table, .table-container, .game-container,
      .game-area, .play-area, .relative.w-full.h-full,
      [data-testid="game-table"], [data-testid="game-container"] {
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 80% !important;
        height: 80% !important;
        max-width: 1200px !important;
        max-height: 800px !important;
        margin: 0 !important;
        padding: 20px !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        background: #1B4D3E !important;
        border-radius: 100px !important;
        border: 8px solid #2C1810 !important;
        box-shadow: 0 0 40px rgba(0, 0, 0, 0.5) !important;
        z-index: 100 !important;
      }

      /* Player positions */
      .player-position, [class*="player-position"] {
        position: absolute !important;
        transform: translate(-50%, -50%) !important;
        width: 140px !important;
        height: 140px !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 200 !important;
      }

      /* Updated player positions in a circle */
      .player-position:nth-child(1), [class*="player-position"]:nth-child(1) { top: 10%; left: 50%; }
      .player-position:nth-child(2), [class*="player-position"]:nth-child(2) { top: 25%; left: 80%; }
      .player-position:nth-child(3), [class*="player-position"]:nth-child(3) { top: 50%; left: 90%; }
      .player-position:nth-child(4), [class*="player-position"]:nth-child(4) { top: 75%; left: 80%; }
      .player-position:nth-child(5), [class*="player-position"]:nth-child(5) { top: 90%; left: 50%; }
      .player-position:nth-child(6), [class*="player-position"]:nth-child(6) { top: 75%; left: 20%; }
      .player-position:nth-child(7), [class*="player-position"]:nth-child(7) { top: 50%; left: 10%; }
      .player-position:nth-child(8), [class*="player-position"]:nth-child(8) { top: 25%; left: 20%; }

      /* Community cards */
      .community-cards, [class*="community-cards"] {
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        display: flex !important;
        gap: 12px !important;
        z-index: 150 !important;
      }

      /* Player cards */
      .player-cards, [class*="player-cards"] {
        display: flex !important;
        gap: 6px !important;
        transform: scale(0.85) !important;
      }

      /* Individual cards */
      .card, [class*="card"] {
        width: 70px !important;
        height: 98px !important;
        background: white !important;
        border-radius: 5px !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        font-size: 16px !important;
        font-weight: bold !important;
        color: black !important;
        border: 1px solid #ccc !important;
      }

      /* Game info displays */
      .pot, .bet-amount, .player-name {
        position: absolute !important;
        color: white !important;
        font-size: 14px !important;
        text-shadow: 1px 1px 2px black !important;
        background: rgba(0, 0, 0, 0.7) !important;
        padding: 4px 8px !important;
        border-radius: 4px !important;
        z-index: 250 !important;
        white-space: nowrap !important;
      }

      .pot { 
        top: 40%; 
        left: 50%; 
        transform: translate(-50%, -50%); 
        font-size: 18px !important;
        padding: 8px 16px !important;
      }
      .bet-amount { bottom: -25px; left: 50%; transform: translateX(-50%); }
      .player-name { top: -25px; left: 50%; transform: translateX(-50%); }

      /* Action buttons */
      .action-button {
        margin: 5px !important;
        padding: 8px 16px !important;
        border-radius: 4px !important;
        background: #2C1810 !important;
        color: white !important;
        border: none !important;
        cursor: pointer !important;
        font-weight: bold !important;
        text-transform: uppercase !important;
        font-size: 12px !important;
      }

      .action-button:not([disabled]):hover {
        background: #3D2419 !important;
      }

      .action-button[disabled] {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }
    `
  });

  // Enable debugging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Found game table') || text.includes('Element details')) {
      console.log(`🔍 Debug: ${text}`);
    }
    if (text.includes('Game updated')) {
      console.log(`🎮 Game update: ${text}`);
      try {
        const gameData = JSON.parse(text.split('Game updated: ')[1]);
        if (gameData.new && gameData.new.current_community_cards) {
          console.log(`🎴 Number of community cards: ${gameData.new.current_community_cards}`);
        }
      } catch (e) {}
    } else if (text.includes('Player updated')) {
      console.log(`👤 Player update: ${text}`);
    } else if (text.includes('Bot')) {
      console.log(`🤖 Bot action: ${text}`);
    } else if (text.includes('Timeout')) {
      console.warn(`⚠️ Timeout: ${text}`);
    } else {
      console.log(`🌐 Browser: ${text}`);
    }
  });

  try {
    // Create Screenshots directory if it doesn't exist
    if (!fs.existsSync('Screenshots')) {
      fs.mkdirSync('Screenshots');
    }

    // Navigate to the game
    console.log('🎮 Connecting to game...');
    await page.goto('http://localhost:8080', {
      waitUntil: 'networkidle'
    });
    
    // Wait for initial load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await takeScreenshot(page, 'initial_load');

    // Login with explicit waits
    console.log('🔑 Logging in...');
    await page.waitForSelector('input[type="text"]');
    await page.waitForSelector('input[type="password"]');
    
    await page.fill('input[type="text"]', 'bigbaga123');
    await page.fill('input[type="password"]', '121212');
    await takeScreenshot(page, 'before_login');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'after_login');

    // Join game with explicit wait
    console.log('🎲 Joining game...');
    await page.waitForSelector('button:has-text("JOIN")');
    await page.click('button:has-text("JOIN")');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'after_join');

    // Start new hand with explicit wait
    console.log('🃏 Starting new hand...');
    await page.waitForSelector('button:has-text("start new hand")');
    await page.click('button:has-text("start new hand")');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'after_start_hand');

    // Wait for game table to be visible
    const tableVisible = await waitForGameTable(page);
    if (!tableVisible) {
      console.log('⚠️ Warning: Game table not visible after starting hand');
    }

    // Add waiting for game table after joining
    await waitForGameTable(page);
    
    // Add periodic checks for community cards
    setInterval(async () => {
      await waitForCommunityCards(page);
    }, 5000);

    // Monitor game state with improved flop detection
    console.log('👀 Monitoring game...');
    let monitoringTime = 0;
    const TOTAL_MONITORING_TIME = 300000; // 5 minutes
    const SCREENSHOT_INTERVAL = 2000; // 2 seconds
    let lastBettingRound = '';
    let waitingForFlop = false;
    let allPlayersActedCount = 0;

    while (monitoringTime < TOTAL_MONITORING_TIME) {
      const gameState = await analyzeGameState(page);
      
      // Handle player turn if needed
      const playerActed = await handlePlayerTurn(page);
      if (playerActed) {
        console.log('✅ Player action completed');
        await sleep(1000);
      }
      
      if (gameState) {
        // Check if all players have acted
        if (gameState.bettingRoundComplete && !waitingForFlop) {
          console.log('🔄 All players have completed their actions');
          waitingForFlop = true;
          allPlayersActedCount++;
          console.log(`   Completed betting rounds: ${allPlayersActedCount}`);
        }

        // Check for flop specifically
        const flopElements = await page.$$('.flop-card, .community-card, .board-card');
        if (flopElements.length > 0) {
          console.log(`\n🎴 Community cards found!`);
          console.log(`   Number of cards: ${flopElements.length}`);
          for (const card of flopElements) {
            const cardText = await card.textContent();
            console.log(`   Card: ${cardText}`);
          }
          await takeScreenshot(page, 'community_cards_detected');
          
          waitingForFlop = false;
        }

        // Faster stuck game detection
        const isStuck = (
          (gameState.playersActed === 0 && monitoringTime > 15000) || // Reduced from 30s to 15s
          (waitingForFlop && monitoringTime > 30000) || // Reduced from 60s to 30s
          (gameState.phase === 'Not found' && monitoringTime > 10000) || // Reduced from 15s to 10s
          (gameState.totalPlayers > 0 && gameState.playersActed === gameState.totalPlayers && monitoringTime > 20000) // New check
        );

        if (isStuck) {
          console.warn('⚠️ Game appears to be stuck!');
          console.log('Reason:', 
            gameState.playersActed === 0 ? 'No players acted' :
            waitingForFlop ? 'Waiting for flop too long' :
            gameState.phase === 'Not found' ? 'Game phase not found' :
            'All players acted but game not progressing'
          );
          
          // Take screenshot before attempting recovery
          await takeScreenshot(page, 'before_recovery');
          
          // Enhanced error message detection
          const errorSelectors = [
            '.error-message', '.alert', '.notification',
            '[data-testid="error"]', '.error-popup', '.warning'
          ];
          const errorMessages = await page.$$eval(
            errorSelectors.join(', '), 
            elements => elements.map(el => el.textContent)
          );
          
          if (errorMessages.length > 0) {
            console.error('Error messages found:');
            errorMessages.forEach(msg => console.error(`   ${msg}`));
          }
          
          // Try to recover from stuck state
          const recovered = await handleStuckGame(page);
          if (recovered) {
            console.log('✅ Successfully recovered from stuck state');
            // Reset monitoring counters
            waitingForFlop = false;
            allPlayersActedCount = 0;
            monitoringTime = 0; // Reset monitoring time after recovery
            await takeScreenshot(page, 'after_recovery');
          } else {
            console.log('❌ Failed to recover from stuck state');
            // Take final screenshot of failed state
            await takeScreenshot(page, 'recovery_failed');
          }
        }
      }

      // Take screenshot and analyze every interval
      if (monitoringTime % SCREENSHOT_INTERVAL === 0) {
        await takeScreenshot(page, `game_state_${monitoringTime/1000}s`);
      }

      await sleep(1000);
      monitoringTime += 1000;
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    await takeScreenshot(page, 'error_state');
  } finally {
    console.log('👋 Closing browser...');
    await browser.close();
  }
}

console.log('🚀 Starting automated game test...\n');
runTest().catch(console.error); 