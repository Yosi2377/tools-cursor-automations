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
      console.error('❌ נמצאו הודעות שגיאה בדף!');
      for (const error of errorElements) {
        const text = await error.textContent();
        console.error(`   שגיאה: ${text}`);
      }
    }

    // Check if important elements are visible
    const gameTable = await page.$('.game-table, .poker-table');
    if (!gameTable) {
      console.warn('⚠️ שולחן המשחק לא נראה בתמונה!');
    }

    // Check for loading indicators
    const loadingElements = await page.$$('.loading, .spinner');
    if (loadingElements.length > 0) {
      console.warn('⚠️ נמצאו אינדיקטורים של טעינה - יתכן שהמשחק תקוע!');
    }

    // Check for player cards
    const playerCards = await page.$$('.player-card, .card');
    console.log(`ℹ️ נמצאו ${playerCards.length} קלפים על השולחן`);

    // Check for active buttons
    const buttons = await page.$$('button:not([disabled])');
    console.log(`ℹ️ נמצאו ${buttons.length} כפתורים פעילים:`);
    for (const button of buttons) {
      const text = await button.textContent();
      console.log(`   - ${text}`);
    }

    // Check for player positions
    const players = await page.$$('.player, .player-position');
    console.log(`ℹ️ נמצאו ${players.length} שחקנים במשחק`);

    return {
      hasErrors: errorElements.length > 0,
      isTableVisible: !!gameTable,
      isLoading: loadingElements.length > 0,
      numCards: playerCards.length,
      numButtons: buttons.length,
      numPlayers: players.length
    };
  } catch (error) {
    console.error('שגיאה בניתוח התמונה:', error);
    return null;
  }
}

async function analyzeGameState(page) {
  try {
    // Check game phase
    const gamePhaseElement = await page.$('.game-phase, .phase, .betting-round');
    const gamePhase = gamePhaseElement ? await gamePhaseElement.textContent() : 'לא נמצא';
    console.log(`🎯 שלב המשחק הנוכחי: ${gamePhase}`);

    // Check pot size
    const potElement = await page.$('.pot, .pot-size');
    const potSize = potElement ? await potElement.textContent() : 'לא נמצא';
    console.log(`💰 גודל הקופה: ${potSize}`);

    // Check current bet
    const currentBetElement = await page.$('.current-bet');
    const currentBet = currentBetElement ? await currentBetElement.textContent() : 'לא נמצא';
    console.log(`🎲 הימור נוכחי: ${currentBet}`);

    // Check active player
    const activePlayerElement = await page.$('.active-player, .current-player');
    const activePlayer = activePlayerElement ? await activePlayerElement.textContent() : 'לא נמצא';
    console.log(`👤 שחקן פעיל: ${activePlayer}`);

    // Check community cards
    const communityCards = await page.$$('.community-card, .board-card, .flop-card, .turn-card, .river-card');
    console.log(`🎴 קלפים קהילתיים: ${communityCards.length}`);
    
    // Check if all players have acted
    const playerElements = await page.$$('.player');
    let playersActed = 0;
    for (const player of playerElements) {
      const hasActed = await player.$('.has-acted, .player-acted');
      if (hasActed) playersActed++;
    }
    console.log(`👥 שחקנים שביצעו פעולה: ${playersActed}/${playerElements.length}`);

    // Check betting round completion
    const allPlayersActed = playersActed === playerElements.length;
    console.log(`${allPlayersActed ? '✅' : '⏳'} סבב ההימורים ${allPlayersActed ? 'הושלם' : 'עדיין בתהליך'}`);

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
    console.error('שגיאה בניתוח מצב המשחק:', error);
    return null;
  }
}

async function takeScreenshot(page, name) {
  const screenshot = await page.screenshot({ fullPage: true });
  const base64Image = screenshot.toString('base64');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join('Screenshots', `${name}_${timestamp}.txt`);
  
  // Save the screenshot
  fs.writeFileSync(filename, base64Image);
  console.log(`\n📸 צילום מסך נשמר: ${filename}`);

  // Analyze the current state
  console.log('\n🔍 מנתח את מצב המשחק...');
  const analysis = await analyzeScreenshot(page, screenshot);
  const gameState = await analyzeGameState(page);
  
  if (analysis) {
    console.log('\n📊 סיכום מצב המשחק:');
    console.log(`   ${analysis.hasErrors ? '❌' : '✅'} הודעות שגיאה`);
    console.log(`   ${analysis.isTableVisible ? '✅' : '❌'} שולחן המשחק נראה`);
    console.log(`   ${analysis.isLoading ? '⚠️' : '✅'} מצב טעינה`);
    console.log(`   🎴 ${analysis.numCards} קלפים`);
    console.log(`   🎮 ${analysis.numButtons} כפתורים פעילים`);
    console.log(`   👥 ${analysis.numPlayers} שחקנים\n`);
  }

  if (gameState) {
    console.log('\n🎮 מצב המשחק המפורט:');
    console.log(`   🎯 שלב: ${gameState.phase}`);
    console.log(`   💰 קופה: ${gameState.potSize}`);
    console.log(`   🎲 הימור נוכחי: ${gameState.currentBet}`);
    console.log(`   👤 שחקן פעיל: ${gameState.activePlayer}`);
    console.log(`   🎴 קלפים קהילתיים: ${gameState.communityCardsCount}`);
    console.log(`   👥 פעולות שחקנים: ${gameState.playersActed}/${gameState.totalPlayers}`);
    console.log(`   ${gameState.bettingRoundComplete ? '✅' : '⏳'} סטטוס סבב\n`);
  }

  return base64Image;
}

async function handlePlayerTurn(page) {
  try {
    // Check if it's our turn
    const callButton = await page.$('button:has-text("Call")');
    const foldButton = await page.$('button:has-text("Fold")');
    const raiseButton = await page.$('button:has-text("Raise")');
    
    if (callButton || foldButton || raiseButton) {
      console.log('🎮 תורך לשחק!');
      
      // Get current bet amount if visible
      const currentBetElement = await page.$('.current-bet');
      const currentBet = currentBetElement ? await currentBetElement.textContent() : '0';
      console.log(`   הימור נוכחי: ${currentBet}`);

      // Prefer calling if possible
      if (callButton) {
        console.log('   בוחר: Call');
        await callButton.click();
        return true;
      } else if (foldButton) {
        console.log('   בוחר: Fold');
        await foldButton.click();
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('שגיאה בטיפול בתור השחקן:', error);
    return false;
  }
}

async function runTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging with better formatting
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Game updated')) {
      console.log(`🎮 עדכון משחק: ${text}`);
      // Parse game state from console log
      try {
        const gameData = JSON.parse(text.split('Game updated: ')[1]);
        if (gameData.new && gameData.new.current_community_cards) {
          console.log(`🎴 מספר קלפים קהילתיים: ${gameData.new.current_community_cards}`);
        }
      } catch (e) {}
    } else if (text.includes('Player updated')) {
      console.log(`👤 עדכון שחקן: ${text}`);
    } else if (text.includes('Bot')) {
      console.log(`🤖 פעולת בוט: ${text}`);
    } else if (text.includes('Timeout')) {
      console.warn(`⚠️ טיימאאוט: ${text}`);
    } else {
      console.log(`🌐 דפדפן: ${text}`);
    }
  });

  try {
    // Create Screenshots directory if it doesn't exist
    if (!fs.existsSync('Screenshots')) {
      fs.mkdirSync('Screenshots');
    }

    // Navigate to the game
    console.log('🎮 מתחבר למשחק...');
    await page.goto('http://localhost:8080');
    await takeScreenshot(page, 'initial_load');
    await sleep(2000);

    // Login
    console.log('🔑 מתחבר למשתמש...');
    await page.fill('input[type="text"]', 'bigbaga123');
    await page.fill('input[type="password"]', '121212');
    await takeScreenshot(page, 'before_login');
    await page.click('button[type="submit"]');
    await sleep(2000);
    await takeScreenshot(page, 'after_login');

    // Join game
    console.log('🎲 מצטרף למשחק...');
    await page.click('button:has-text("JOIN")');
    await sleep(2000);
    await takeScreenshot(page, 'after_join');

    // Start new hand
    console.log('🃏 מתחיל יד חדשה...');
    await page.click('button:has-text("start new hand")');
    await sleep(2000);
    await takeScreenshot(page, 'after_start_hand');

    // Monitor game state with improved flop detection
    console.log('👀 מנטר את המשחק...');
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
        console.log('✅ השחקן ביצע פעולה');
        await sleep(1000); // קצת זמן לעדכון המצב
      }
      
      if (gameState) {
        // Check if all players have acted
        if (gameState.bettingRoundComplete && !waitingForFlop) {
          console.log('🔄 כל השחקנים השלימו את ההימורים');
          waitingForFlop = true;
          allPlayersActedCount++;
          console.log(`   מספר סבבים שהושלמו: ${allPlayersActedCount}`);
        }

        // Check for flop specifically
        const flopElements = await page.$$('.flop-card, .community-card, .board-card');
        if (flopElements.length > 0) {
          console.log(`\n🎴 נמצאו קלפים קהילתיים!`);
          console.log(`   מספר קלפים: ${flopElements.length}`);
          for (const card of flopElements) {
            const cardText = await card.textContent();
            console.log(`   קלף: ${cardText}`);
          }
          await takeScreenshot(page, 'community_cards_detected');
          
          // Reset waiting for flop
          waitingForFlop = false;
        }

        // Check for stuck game
        if (gameState.playersActed === 0 && monitoringTime > 30000) {
          console.warn('⚠️ נראה שהמשחק תקוע - אף שחקן לא ביצע פעולה!');
          // Try to find any error messages
          const errorMessages = await page.$$eval('.error-message, .alert, .notification', 
            elements => elements.map(el => el.textContent));
          if (errorMessages.length > 0) {
            console.error('נמצאו הודעות שגיאה:');
            errorMessages.forEach(msg => console.error(`   ${msg}`));
          }
        }
      }

      // Take screenshot and analyze every interval
      if (monitoringTime % SCREENSHOT_INTERVAL === 0) {
        await takeScreenshot(page, `game_state_${monitoringTime/1000}s`);
      }

      await sleep(1000); // Check more frequently
      monitoringTime += 1000;
    }

  } catch (error) {
    console.error('❌ הבדיקה נכשלה:', error);
    await takeScreenshot(page, 'error_state');
  } finally {
    console.log('👋 סוגר את הדפדפן...');
    await browser.close();
  }
}

console.log('🚀 מתחיל בדיקת משחק אוטומטית...\n');
runTest().catch(console.error); 