import { chromium, Browser, Page } from 'playwright';
import * as dotenv from 'dotenv';

dotenv.config();

export class BrowserAutomation {
    private page: Page | null = null;
    private browser: Browser | null = null;

    constructor() {
        // ... existing code ...
    }

    async init() {
        console.log('Initializing browser...');
        if (!this.browser) {
            this.browser = await chromium.launch({ 
                headless: false, 
                devtools: true,
                args: ['--auto-open-devtools-for-tabs']
            });
        }
        if (!this.page) {
            this.page = await this.browser.newPage();
            await this.page.setViewportSize({ width: 1280, height: 720 });
            
            // Force switch to console tab in devtools
            const cdpClient = await this.page.context().newCDPSession(this.page);
            await cdpClient.send('Runtime.enable');
            await cdpClient.send('Console.enable');
            
            // Switch to console panel
            await cdpClient.send('Runtime.evaluate', {
                expression: `
                    setTimeout(() => {
                        const devtools = window['__devtools__'];
                        if (devtools) {
                            devtools.showPanel('console');
                        }
                    }, 1000);
                `
            });

            // Enable console preservation
            await this.page.evaluate(() => {
                const consoleObj = console as any;
                consoleObj.defaultLog = console.log.bind(console);
                consoleObj.defaultError = console.error.bind(console);
                consoleObj.defaultWarn = console.warn.bind(console);
                consoleObj.defaultInfo = console.info.bind(console);
                
                const logs: string[] = [];
                
                console.log = (...args: any[]) => {
                    logs.push(['LOG', ...args].join(' '));
                    consoleObj.defaultLog(...args);
                };
                
                console.error = (...args: any[]) => {
                    logs.push(['ERROR', ...args].join(' '));
                    consoleObj.defaultError(...args);
                };
                
                console.warn = (...args: any[]) => {
                    logs.push(['WARN', ...args].join(' '));
                    consoleObj.defaultWarn(...args);
                };
                
                console.info = (...args: any[]) => {
                    logs.push(['INFO', ...args].join(' '));
                    consoleObj.defaultInfo(...args);
                };
                
                (window as any).__consoleLogs = logs;
            });
            
            const messages: string[] = [];
            
            // Listen to console messages via CDP
            cdpClient.on('Console.messageAdded', (event) => {
                const msg = event.message;
                const text = msg.text;
                const level = msg.level;
                const url = msg.url;
                const line = msg.line;
                
                const formattedMessage = `[${level.toUpperCase()}] ${text} (${url}:${line})`;
                messages.push(formattedMessage);
                
                if (level === 'error') {
                    console.error('\x1b[31m%s\x1b[0m', formattedMessage);
                } else if (level === 'warning') {
                    console.warn('\x1b[33m%s\x1b[0m', formattedMessage);
                } else {
                    console.log(formattedMessage);
                }
            });

            // Listen to runtime errors
            cdpClient.on('Runtime.exceptionThrown', (event) => {
                const error = event.exceptionDetails;
                const errorMessage = `[ERROR] Runtime Error: ${error.text} (${error.url}:${error.lineNumber})`;
                messages.push(errorMessage);
                console.error('\x1b[31m%s\x1b[0m', errorMessage);
            });

            // Store messages in page context
            this.page.evaluate((msgs) => {
                (window as any).__consoleLogs = msgs;
            }, messages);

            // Capture uncaught errors
            this.page.on('pageerror', (error) => {
                const errorMessage = `[ERROR] Uncaught Error: ${error.message}`;
                messages.push(errorMessage);
                console.error(errorMessage);
            });

            // Capture failed requests
            this.page.on('requestfailed', (request) => {
                const failure = request.failure();
                const failureMessage = `[ERROR] Failed Request: ${request.url()} - ${failure?.errorText || 'unknown error'}`;
                messages.push(failureMessage);
                console.error(failureMessage);
            });
        }
        console.log('Browser initialized');
    }

    async close() {
        console.log('Closing browser...');
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
        console.log('Browser closed');
    }

    async navigateTo(url: string) {
        if (!this.page) {
            throw new Error('Browser not initialized');
        }
        console.log(`Navigating to ${url}...`);
        await this.page.goto(url);
        console.log('Waiting for page to load...');
        await this.page.waitForLoadState('networkidle', { timeout: 60000 });
        // Add a longer delay after page load
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('Page loaded');

        // Debug: Log the page content
        const content = await this.page.content();
        console.log('Page content:', content);
    }

    async login(username: string, password: string) {
        if (!this.page) {
            throw new Error('Browser not initialized');
        }

        try {
            // Try multiple selector strategies for username
            const usernameSelectors = [
                'input[name="username"]',
                'input[placeholder*="username"]',
                'input[type="text"]',
                '[aria-label*="username"]'
            ];

            // Try multiple selector strategies for password
            const passwordSelectors = [
                'input[name="password"]',
                'input[placeholder*="password"]',
                'input[type="password"]',
                '[aria-label*="password"]'
            ];

            // Try multiple selector strategies for login button
            const loginButtonSelectors = [
                'button:has-text("Log In")',
                'button:has-text("Login")',
                'button:has-text("Sign In")',
                '[type="submit"]'
            ];

            // Fill username
            for (const sel of usernameSelectors) {
                try {
                    await this.page.waitForSelector(sel, { state: 'visible', timeout: 2000 });
                    await this.page.fill(sel, username);
                    console.log('Successfully filled username using selector:', sel);
                    break;
                } catch (error: any) {
                    console.log('Failed with username selector:', sel, error?.message || 'Unknown error');
                }
            }

            // Fill password
            for (const sel of passwordSelectors) {
                try {
                    await this.page.waitForSelector(sel, { state: 'visible', timeout: 2000 });
                    await this.page.fill(sel, password);
                    console.log('Successfully filled password using selector:', sel);
                    break;
                } catch (error: any) {
                    console.log('Failed with password selector:', sel, error?.message || 'Unknown error');
                }
            }

            // Click login button
            for (const sel of loginButtonSelectors) {
                try {
                    await this.page.waitForSelector(sel, { state: 'visible', timeout: 2000 });
                    await this.page.click(sel);
                    console.log('Successfully clicked login button using selector:', sel);
                    break;
                } catch (error: any) {
                    console.log('Failed with login button selector:', sel, error?.message || 'Unknown error');
                }
            }

            // Wait for navigation and for JOIN button to appear
            await this.page.waitForLoadState('networkidle');
            await this.page.waitForTimeout(5000);

            // Try to click the JOIN button
            const joinButtonSelectors = [
                'button:has-text("JOIN")',
                'button:has-text("Join")',
                '[role="button"]:has-text("JOIN")',
                '[role="button"]:has-text("Join")'
            ];

            for (const sel of joinButtonSelectors) {
                try {
                    await this.page.waitForSelector(sel, { state: 'visible', timeout: 2000 });
                    await this.page.click(sel);
                    console.log('Successfully clicked JOIN button using selector:', sel);
                    
                    // Wait after clicking JOIN
                    await this.page.waitForTimeout(5000);
                    break;
                } catch (error: any) {
                    console.log('Failed with JOIN button selector:', sel, error?.message || 'Unknown error');
                }
            }

            // Try to click the Start New Hand button
            const startHandButtonSelectors = [
                'button:has-text("Start New Hand")',
                'button:has-text("START NEW HAND")',
                '[role="button"]:has-text("Start New Hand")',
                '[role="button"]:has-text("START NEW HAND")'
            ];

            for (const sel of startHandButtonSelectors) {
                try {
                    await this.page.waitForSelector(sel, { state: 'visible', timeout: 2000 });
                    await this.page.click(sel);
                    console.log('Successfully clicked Start New Hand button using selector:', sel);
                    break;
                } catch (error: any) {
                    console.log('Failed with Start New Hand button selector:', sel, error?.message || 'Unknown error');
                }
            }

            // After clicking Start New Hand, try to interact with the game
            console.log('Attempting to interact with the game...');
            
            // Wait for game elements to appear
            await this.page.waitForTimeout(5000);

            // Try to click CALL/CHECK button if available
            const gameActionSelectors = [
                'button:has-text("CALL")',
                'button:has-text("CHECK")',
                'button:has-text("FOLD")',
                'button:has-text("RAISE")',
                '[role="button"]:has-text("CALL")',
                '[role="button"]:has-text("CHECK")',
                '[role="button"]:has-text("FOLD")',
                '[role="button"]:has-text("RAISE")'
            ];

            for (const sel of gameActionSelectors) {
                try {
                    const button = await this.page.waitForSelector(sel, { state: 'visible', timeout: 2000 });
                    if (button) {
                        await button.click();
                        console.log(`Successfully clicked game action button: ${sel}`);
                        await this.page.waitForTimeout(2000);
                    }
                } catch (error: any) {
                    console.log(`Game action button not found: ${sel}`);
                }
            }

            // Try to interact with bet slider if available
            try {
                const sliderSelector = 'input[type="range"]';
                const slider = await this.page.waitForSelector(sliderSelector, { state: 'visible', timeout: 2000 });
                if (slider) {
                    await slider.fill('50');
                    console.log('Successfully interacted with bet slider');
                    await this.page.waitForTimeout(2000);
                }
            } catch (error: any) {
                console.log('Bet slider not found or not interactive');
            }

            // Wait for 30 seconds and check for console errors
            console.log('Waiting for 30 seconds and checking for console errors...');
            await this.page.waitForTimeout(30000);

            // Get all collected messages
            const collectedMessages = await this.page.evaluate(() => (window as any).__consoleLogs || []);
            
            if (collectedMessages.length > 0) {
                console.log('\nConsole messages during the session:');
                collectedMessages.forEach((message: string) => {
                    if (message.includes('[ERROR]')) {
                        console.log('\x1b[31m%s\x1b[0m', message); // Red color for errors
                    } else if (message.includes('[WARNING]')) {
                        console.log('\x1b[33m%s\x1b[0m', message); // Yellow color for warnings
                    } else {
                        console.log(message);
                    }
                });
            } else {
                console.log('\nNo console messages found during the session');
            }

            // Check specifically for errors
            const errors = collectedMessages.filter((msg: string) => 
                msg.includes('[ERROR]') || 
                msg.includes('[WARNING]') || 
                msg.includes('Runtime Error')
            );
            
            if (errors.length > 0) {
                console.log('\nFound errors during the session:');
                errors.forEach((error: string) => 
                    console.log('\x1b[31m%s\x1b[0m', error)
                );
            } else {
                console.log('\nNo errors found during the session');
            }

            // Log game state
            console.log('Checking game state...');
            const gameElements = await this.page.$$('div, button, span');
            for (const element of gameElements) {
                const text = await element.textContent();
                if (text && (text.includes('$') || text.includes('Chips') || text.includes('Pot'))) {
                    console.log(`Game state element found: ${text}`);
                }
            }

        } catch (error: any) {
            throw new Error(`Failed to interact with game: ${error?.message || 'Unknown error'}`);
        }
    }

    private async waitForElement(selector: string, timeout = 60000) {
        if (!this.page) {
            throw new Error('Browser not initialized');
        }
        console.log(`Waiting for element with selector: ${selector}`);
        try {
            await this.page.waitForSelector(selector, { timeout, state: 'visible' });
            // Add a longer delay after finding the element
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log(`Element found: ${selector}`);

            // Debug: Log element details
            const element = await this.page.$(selector);
            if (element) {
                const text = await element.textContent();
                const isVisible = await element.isVisible();
                console.log(`Element details - Text: ${text}, Visible: ${isVisible}`);
            }

            return true;
        } catch (error) {
            console.log(`Element not found: ${selector}`);
            return false;
        }
    }

    async click(description: string) {
        if (!this.page) {
            throw new Error('Browser not initialized');
        }

        console.log(`Attempting to click element with description: ${description}`);

        // Debug: Log all buttons on the page
        const buttons = await this.page.$$('button, [role="button"], a');
        for (const button of buttons) {
            const text = await button.textContent();
            const isVisible = await button.isVisible();
            console.log(`Found button - Text: ${text}, Visible: ${isVisible}`);
        }

        // Simple selectors for buttons
        const selectors = [
            `button:has-text("${description}")`,
            `[role="button"]:has-text("${description}")`,
            `a:has-text("${description}")`,
            `text=${description}`,
            `button[type="submit"]`,
            description
        ];

        console.log('Trying selectors:', selectors);

        for (const selector of selectors) {
            console.log(`Trying selector: ${selector}`);
            try {
                const element = await this.page.waitForSelector(selector, { timeout: 5000, state: 'visible' });
                if (!element) continue;
                
                console.log(`Found element with selector: ${selector}`);
                await element.click();
                console.log('Click successful');
                return;
            } catch (error) {
                console.log(`Failed with selector: ${selector}`, error);
            }
        }
        throw new Error(`Failed to click element: Could not find element with any of the attempted selectors`);
    }

    async fill(description: string, value: string) {
        if (!this.page) {
            throw new Error('Browser not initialized');
        }

        console.log(`Attempting to fill element with description: ${description}`);
        
        // Wait for page to be fully loaded
        await this.page.waitForLoadState('networkidle');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Debug: Log all input fields on the page
        const inputs = await this.page.$$('input');
        for (const input of inputs) {
            const type = await input.getAttribute('type');
            const name = await input.getAttribute('name');
            const id = await input.getAttribute('id');
            const placeholder = await input.getAttribute('placeholder');
            const isVisible = await input.isVisible();
            console.log(`Found input - Type: ${type}, Name: ${name}, ID: ${id}, Placeholder: ${placeholder}, Visible: ${isVisible}`);
        }

        // Simple selectors for input fields, prioritizing placeholder
        const selectors = [
            `input[placeholder="${description}"]`,
            `input[type="${description}"]`,
            `input[name="${description}"]`,
            `#${description}`,
            `input[type="text"]`,
            `input[type="password"]`,
            description
        ];

        console.log('Trying selectors:', selectors);

        for (const selector of selectors) {
            console.log(`Trying selector: ${selector}`);
            try {
                const element = await this.page.waitForSelector(selector, { timeout: 5000, state: 'visible' });
                if (!element) continue;
                
                console.log(`Found element with selector: ${selector}`);
                
                // Clear the field first
                await element.fill('');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Type the value slowly
                await element.type(value, { delay: 100 });
                console.log('Successfully filled input');
                return;
            } catch (error) {
                console.log(`Failed with selector: ${selector}`, error);
            }
        }
        throw new Error(`Failed to type text: Could not find element with any of the attempted selectors`);
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const actionOrUrl = args[1];
    const options = parseOptions(args.slice(2));

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error('GOOGLE_API_KEY environment variable is required');
        process.exit(1);
    }

    const tools = new BrowserAutomation();

    try {
        switch (command) {
            case 'browser':
                await tools.init();
                if (actionOrUrl.startsWith('http')) {
                    // Just open the URL
                    console.log('Browser opened at:', actionOrUrl);
                } else {
                    // Execute the action
                    await tools.click(actionOrUrl);
                    console.log('Action executed successfully');
                }
                break;
            default:
                console.error('Unknown command:', command);
                process.exit(1);
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await tools.close();
    }
}

function parseOptions(args: string[]): Record<string, any> {
    const options: Record<string, any> = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const value = args[i + 1];
            if (value && !value.startsWith('--')) {
                options[key] = value;
                i++;
            } else {
                options[key] = true;
            }
        }
    }
    return options;
}

if (require.main === module) {
    main().catch(console.error);
}

export default BrowserAutomation; 