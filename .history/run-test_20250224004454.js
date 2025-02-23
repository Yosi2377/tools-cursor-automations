import {
    initializeBrowser,
    login,
    takeScreenshot,
    analyzeScreenshot,
    checkAndFixElementPosition,
    sleep
} from './web-test.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-config.json')));

/**
 * Executes a test scenario
 * @param {Object} page - Puppeteer page object
 * @param {Object} scenario - Test scenario configuration
 */
async function executeScenario(page, scenario) {
    console.log(`Executing scenario: ${scenario.name}`);
    
    try {
        // Execute each step in the scenario
        for (const step of scenario.steps) {
            console.log(`Executing step: ${step.name}`);
            
            // Wait for element if specified
            if (step.waitForSelector) {
                await page.waitForSelector(step.waitForSelector, { timeout: config.browser.timeout });
            }
            
            // Take screenshot before action if enabled
            if (step.screenshotBefore) {
                const beforeScreen = await takeScreenshot(page, `${scenario.name}_${step.name}_before`);
                if (beforeScreen) {
                    const analysis = await analyzeScreenshot(beforeScreen);
                    console.log('Before step analysis:', analysis);
                }
            }
            
            // Execute action based on type
            switch (step.action) {
                case 'click':
                    await page.click(step.selector);
                    break;
                    
                case 'type':
                    await page.type(step.selector, step.value);
                    break;
                    
                case 'select':
                    await page.select(step.selector, step.value);
                    break;
                    
                case 'wait':
                    await sleep(step.duration || config.actions.defaultDelay);
                    break;
                    
                case 'checkPosition':
                    await checkAndFixElementPosition(page, step.selector);
                    break;
                    
                case 'custom':
                    if (typeof step.execute === 'function') {
                        await step.execute(page);
                    }
                    break;
                    
                default:
                    console.warn(`Unknown action type: ${step.action}`);
            }
            
            // Wait after action
            await sleep(step.delay || config.actions.defaultDelay);
            
            // Take screenshot after action if enabled
            if (step.screenshotAfter) {
                const afterScreen = await takeScreenshot(page, `${scenario.name}_${step.name}_after`);
                if (afterScreen) {
                    const analysis = await analyzeScreenshot(afterScreen);
                    console.log('After step analysis:', analysis);
                }
            }
            
            // Verify step if validation is specified
            if (step.validate) {
                const isValid = await step.validate(page);
                if (!isValid) {
                    throw new Error(`Validation failed for step: ${step.name}`);
                }
            }
        }
        
        console.log(`Scenario completed: ${scenario.name}`);
    } catch (error) {
        console.error(`Scenario failed: ${scenario.name}`, error);
        throw error;
    }
}

/**
 * Main test runner
 */
async function runTests() {
    let browser, page;
    
    try {
        // Initialize browser
        ({ browser, page } = await initializeBrowser());
        console.log('Browser initialized');
        
        // Navigate to base URL
        await page.goto(config.baseUrl);
        console.log('Navigated to base URL');
        
        // Perform login if enabled
        if (config.auth.enabled) {
            await login(page);
        }
        
        // Load test scenarios
        const scenarios = loadTestScenarios();
        
        // Execute each scenario
        for (const scenario of scenarios) {
            await executeScenario(page, scenario);
        }
        
        console.log('All tests completed successfully');
        
    } catch (error) {
        console.error('Tests failed:', error);
        
        if (config.screenshots.captureOnError && page) {
            await takeScreenshot(page, 'test_failure');
        }
        
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed');
        }
    }
}

/**
 * Loads test scenarios from configuration or external files
 * @returns {Array} Array of test scenarios
 */
function loadTestScenarios() {
    // Example scenarios - replace with your own or load from files
    return [
        {
            name: 'Basic Navigation',
            steps: [
                {
                    name: 'Check Main Container',
                    action: 'checkPosition',
                    selector: config.selectors.mainContainer,
                    screenshotAfter: true
                },
                {
                    name: 'Wait for Content',
                    action: 'wait',
                    duration: 2000
                }
            ]
        }
        // Add more scenarios as needed
    ];
}

// Run tests if this is the main module
if (import.meta.url === fileURLToPath(import.meta.url)) {
    runTests().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
} 