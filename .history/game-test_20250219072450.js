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

    // Check if important elements are visible
    const gameTable = await page.$('.game-table, .poker-table');
    if (!gameTable) {
      console.warn('⚠️ Game table not visible in screenshot!');
    }

    // Check for loading indicators
    const loadingElements = await page.$$('.loading, .spinner');
    if (loadingElements.length > 0) {
      console.warn('⚠️ Loading indicators found - game might be stuck!');
    }

    // Check for player cards
    const playerCards = await page.$$('.player-card, .card');
    console.log(`ℹ️ Found ${playerCards.length} cards on table`);

    // Check for active buttons
    const buttons = await page.$$('button:not([disabled])');
    console.log(`ℹ️ Found ${buttons.length} active buttons:`);
    for (const button of buttons) {
      const text = await button.textContent();
      console.log(`   - ${text}`);
    }

    // Check for player positions
    const players = await page.$$('.player, .player-position');
    console.log(`ℹ️ Found ${players.length} players in game`);

    return {
      hasErrors: errorElements.length > 0,
      isTableVisible: !!gameTable,
      isLoading: loadingElements.length > 0,
      numCards: playerCards.length,
      numButtons: buttons.length,
      numPlayers: players.length
    };
  } catch (error) {
    console.error('Error analyzing screenshot:', error);
    return null;
  }
}

async function analyzeGameState(page) {
  try {
    // Check game phase
    const gamePhaseElement = await page.$('.game-phase, .phase, .betting-round');
    const gamePhase = gamePhaseElement ? await gamePhaseElement.textContent() : 'Not found';
    console.log(`🎯 Current game phase: ${gamePhase}`);

    // Check pot size
    const potElement = await page.$('.pot, .pot-size');
    const potSize = potElement ? await potElement.textContent() : 'Not found';
    console.log(`💰 Pot size: ${potSize}`);

    // Check current bet
    const currentBetElement = await page.$('.current-bet');
    const currentBet = currentBetElement ? await currentBetElement.textContent() : 'Not found';
    console.log(`🎲 Current bet: ${currentBet}`);

    // Check active player
    const activePlayerElement = await page.$('.active-player, .current-player');
    const activePlayer = activePlayerElement ? await activePlayerElement.textContent() : 'Not found';
    console.log(`👤 Active player: ${activePlayer}`);

    // Check community cards
    const communityCards = await page.$$('.community-card, .board-card, .flop-card, .turn-card, .river-card');
    console.log(`🎴 Community cards: ${communityCards.length}`);
    
    // Check if all players have acted
    const playerElements = await page.$$('.player');
    let playersActed = 0;
    for (const player of playerElements) {
      const hasActed = await player.$('.has-acted, .player-acted');
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
    // Try multiple selectors for game table
    const tableSelectors = [
      '.game-table',
      '.poker-table',
      '.table-container',
      '.game-container',
      '[data-testid="game-table"]',
      '.table',
      '.board'
    ];
    
    for (const selector of tableSelectors) {
      try {
        await page.waitForSelector(selector, { 
          timeout: 5000,
          state: 'visible'
        });
        console.log(`🎲 Game table found with selector: ${selector}`);
        return true;
      } catch (e) {
        continue;
      }
    }
    
    console.log('⚠️ Game table not found with any selector');
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

    // Try to find the game container
    const gameContainer = await page.$('.game-container, .poker-table, .table-container');
    
    let screenshot;
    if (gameContainer) {
      // If game container found, take screenshot of just that element
      screenshot = await gameContainer.screenshot({
        type: 'png',
        fullPage: false,
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
      console.log(`   🎮 ${analysis.numButtons} active buttons`);
      console.log(`   👥 ${analysis.numPlayers} players\n`);
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

async function runTest() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized'] // Start with maximized window
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 } // Set high resolution
  });
  
  const page = await context.newPage();

  // Add styles to ensure game table is visible
  await page.addStyleTag({
    content: `
      .game-table, .poker-table, .table-container, .game-container {
        visibility: visible !important;
        display: block !important;
        opacity: 1 !important;
      }
    `
  });

  // Enable console logging with better formatting
  page.on('console', msg => {
    const text = msg.text();
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

        // Check for stuck game
        if (gameState.playersActed === 0 && monitoringTime > 30000) {
          console.warn('⚠️ Game appears to be stuck - no player actions detected!');
          const errorMessages = await page.$$eval('.error-message, .alert, .notification', 
            elements => elements.map(el => el.textContent));
          if (errorMessages.length > 0) {
            console.error('Error messages found:');
            errorMessages.forEach(msg => console.error(`   ${msg}`));
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