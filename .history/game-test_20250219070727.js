import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name) {
  const screenshot = await page.screenshot({ fullPage: true });
  const base64Image = screenshot.toString('base64');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join('Screenshots', `${name}_${timestamp}.txt`);
  fs.writeFileSync(filename, base64Image);
  console.log(`Screenshot saved: ${filename}`);
  return base64Image;
}

async function runTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    console.log(`Browser Console: ${msg.text()}`);
  });

  try {
    // Create Screenshots directory if it doesn't exist
    if (!fs.existsSync('Screenshots')) {
      fs.mkdirSync('Screenshots');
    }

    // Navigate to the game
    console.log('Navigating to game...');
    await page.goto('http://localhost:8080');
    await takeScreenshot(page, 'initial_load');
    await sleep(2000);

    // Login
    console.log('Logging in...');
    await page.fill('input[type="text"]', 'bigbaga123');
    await page.fill('input[type="password"]', '121212');
    await takeScreenshot(page, 'before_login');
    await page.click('button[type="submit"]');
    await sleep(2000);
    await takeScreenshot(page, 'after_login');

    // Join game
    console.log('Joining game...');
    await page.click('button:has-text("JOIN")');
    await sleep(2000);
    await takeScreenshot(page, 'after_join');

    // Start new hand
    console.log('Starting new hand...');
    await page.click('button:has-text("start new hand")');
    await sleep(2000);
    await takeScreenshot(page, 'after_start_hand');

    // Monitor game state
    console.log('Monitoring game state...');
    let monitoringTime = 0;
    const TOTAL_MONITORING_TIME = 300000; // 5 minutes
    const SCREENSHOT_INTERVAL = 5000; // 5 seconds

    while (monitoringTime < TOTAL_MONITORING_TIME) {
      await takeScreenshot(page, `game_state_${monitoringTime/1000}s`);
      
      // Check for active buttons and try to interact
      const buttons = await page.$$('button:not([disabled])');
      for (const button of buttons) {
        const text = await button.textContent();
        console.log(`Found active button: ${text}`);
      }

      // Check for flop
      const flopElements = await page.$$('.flop-card');
      if (flopElements.length > 0) {
        console.log(`Found ${flopElements.length} flop cards`);
        await takeScreenshot(page, 'flop_detected');
      }

      await sleep(SCREENSHOT_INTERVAL);
      monitoringTime += SCREENSHOT_INTERVAL;
    }

  } catch (error) {
    console.error('Test failed:', error);
    await takeScreenshot(page, 'error_state');
  } finally {
    await browser.close();
  }
}

runTest().catch(console.error); 