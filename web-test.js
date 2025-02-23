import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { createWorker } from 'tesseract.js';
import { 
    GameError, 
    ConnectionError, 
    GameStateError, 
    PlayerActionError,
    RoundStuckError,
    retry,
    logError,
    recoverFromError
} from './src/utils/errorHandler.js';
import { analyzeGameState } from './src/utils/gameAnalyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-config.json')));

/**
 * Pauses execution for a specified amount of time.
 * @param {number} ms - The number of milliseconds to sleep.
 */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Initializes the browser with configured settings
 * @returns {Object} Browser and page objects
 */
async function initializeBrowser() {
    try {
        const browser = await puppeteer.launch({
            headless: config.browser.headless,
            args: ['--start-maximized', '--no-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport(config.browser.viewport);

        // Setup console logging
        page.on('console', msg => console.log('Browser:', msg.text()));
        page.on('pageerror', err => console.error('Page Error:', err));
        page.on('requestfailed', req => console.error('Request Failed:', req.url()));

        return { browser, page };
    } catch (error) {
        throw new Error(`Browser initialization failed: ${error.message}`);
    }
}

/**
 * Performs login if authentication is enabled
 * @param {Object} page - Puppeteer page object
 */
async function login(page) {
    if (!config.auth.enabled) return;

    try {
        await page.goto(`${config.baseUrl}${config.auth.url}`);
        await page.waitForSelector(config.auth.selectors.username);
        
        await page.type(config.auth.selectors.username, config.auth.credentials.username);
        await page.type(config.auth.selectors.password, config.auth.credentials.password);
        
        await page.click(config.auth.selectors.submitButton);
        await page.waitForNavigation();
        
        console.log('Login successful');
    } catch (error) {
        throw new Error(`Login failed: ${error.message}`);
    }
}

/**
 * Takes a screenshot of the current page state
 * @param {Object} page - Puppeteer page object
 * @param {string} name - Name for the screenshot
 */
async function takeScreenshot(page, name) {
    if (!config.screenshots.enabled) return null;

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = path.join(config.screenshots.directory, `${name}_${timestamp}.png`);
        
        await fs.promises.mkdir(config.screenshots.directory, { recursive: true });
        await page.screenshot({ path: filename, fullPage: true });
        
        return filename;
    } catch (error) {
        console.error(`Screenshot failed: ${error.message}`);
        return null;
    }
}

/**
 * Analyzes a screenshot using OCR
 * @param {string} screenshotPath - Path to the screenshot
 * @returns {Object} Analysis results
 */
async function analyzeScreenshot(screenshotPath) {
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    const { data: { text } } = await worker.recognize(screenshotPath);
    await worker.terminate();
    
    return {
        text,
        timestamp: new Date().toISOString(),
        path: screenshotPath
    };
}

/**
 * Checks and fixes element position if needed
 * @param {Object} page - Puppeteer page object
 * @param {string} selector - Element selector
 */
async function checkAndFixElementPosition(page, selector) {
    try {
        const element = await page.$(selector);
        if (!element) return false;

        const isVisible = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return false;
            
            const rect = el.getBoundingClientRect();
            return rect.top >= 0 &&
                   rect.left >= 0 &&
                   rect.bottom <= window.innerHeight &&
                   rect.right <= window.innerWidth;
        }, selector);

        if (!isVisible) {
            await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, selector);
            await sleep(1000);
            return true;
        }

        return false;
    } catch (error) {
        console.error(`Position check failed: ${error.message}`);
        return false;
    }
}

/**
 * Main test execution function
 */
async function runTest() {
    let browser, page;
    
    try {
        ({ browser, page } = await initializeBrowser());
        console.log('Browser initialized');

        await page.goto(config.baseUrl);
        console.log('Navigated to base URL');

        if (config.auth.enabled) {
        await login(page);
        }

        // Wait for main container
        await page.waitForSelector(config.selectors.mainContainer);
        
        // Take initial screenshot
        const initialScreen = await takeScreenshot(page, 'initial_state');
        if (initialScreen) {
            const analysis = await analyzeScreenshot(initialScreen);
            console.log('Initial page analysis:', analysis);
        }

        // Example of checking element position
        const mainContainer = config.selectors.mainContainer;
        const positionFixed = await checkAndFixElementPosition(page, mainContainer);
        if (positionFixed) {
            console.log('Adjusted main container position');
            await takeScreenshot(page, 'after_position_fix');
        }

        // Add your test steps here

    } catch (error) {
        console.error('Test failed:', error);
        
        if (config.screenshots.captureOnError && page) {
            await takeScreenshot(page, 'error_state');
        }
        
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed');
        }
    }
}

// Export functions for use in other test files
export {
    sleep,
    initializeBrowser,
    login,
    takeScreenshot,
    analyzeScreenshot,
    checkAndFixElementPosition,
    runTest
};

// Run test if this is the main module
if (import.meta.url === fileURLToPath(import.meta.url)) {
runTest().catch(error => {
        console.error('Fatal error:', error);
    process.exit(1);
}); 
} 