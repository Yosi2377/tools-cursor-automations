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
  
  if (analysis) {
    console.log('\n📊 סיכום מצב המשחק:');
    console.log(`   ${analysis.hasErrors ? '❌' : '✅'} הודעות שגיאה`);
    console.log(`   ${analysis.isTableVisible ? '✅' : '❌'} שולחן המשחק נראה`);
    console.log(`   ${analysis.isLoading ? '⚠️' : '✅'} מצב טעינה`);
    console.log(`   🎴 ${analysis.numCards} קלפים`);
    console.log(`   🎮 ${analysis.numButtons} כפתורים פעילים`);
    console.log(`   👥 ${analysis.numPlayers} שחקנים\n`);
  }

  return base64Image;
}

async function runTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    console.log(`🌐 דפדפן: ${msg.text()}`);
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

    // Monitor game state
    console.log('👀 מנטר את המשחק...');
    let monitoringTime = 0;
    const TOTAL_MONITORING_TIME = 300000; // 5 minutes
    const SCREENSHOT_INTERVAL = 5000; // 5 seconds

    while (monitoringTime < TOTAL_MONITORING_TIME) {
      await takeScreenshot(page, `game_state_${monitoringTime/1000}s`);
      
      // Check for flop
      const flopElements = await page.$$('.flop-card');
      if (flopElements.length > 0) {
        console.log(`🎴 נמצאו ${flopElements.length} קלפי פלופ!`);
        await takeScreenshot(page, 'flop_detected');
      }

      await sleep(SCREENSHOT_INTERVAL);
      monitoringTime += SCREENSHOT_INTERVAL;
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