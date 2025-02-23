#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { BrowserAutomation } from './index';

interface Arguments {
    _: (string | number)[];
    $0: string;
    url?: string;
    action?: string;
    selector?: string;
    value?: string;
    username?: string;
    password?: string;
}

const argv = yargs(hideBin(process.argv))
    .command('browser', 'Browser automation commands', (yargs) => {
        return yargs
            .option('url', {
                alias: 'u',
                type: 'string',
                description: 'URL to navigate to',
                demandOption: true
            })
            .option('action', {
                alias: 'a',
                type: 'string',
                description: 'Action to perform (e.g., click, type, login)',
                demandOption: true
            })
            .option('selector', {
                alias: 's',
                type: 'string',
                description: 'Element selector or description',
            })
            .option('value', {
                alias: 'v',
                type: 'string',
                description: 'Value for type action',
            })
            .option('username', {
                type: 'string',
                description: 'Username for login action',
            })
            .option('password', {
                type: 'string',
                description: 'Password for login action',
            });
    })
    .command('test', 'Run game test', () => {})
    .help()
    .parseSync() as unknown as Arguments;

async function main() {
    const tools = new BrowserAutomation();

    try {
        await tools.init();

        if (argv._.includes('test')) {
            await tools.navigateTo('http://localhost:8081');
            await tools.takeScreenshot('initial_state');
            
            // Login with credentials
            await tools.fill('input[type="text"]', 'bigbaga123');
            await tools.fill('input[type="password"]', '121212');
            await tools.click('button[type="submit"]');
            await tools.takeScreenshot('after_login');
            
            // Wait for page to load after login
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Click JOIN button
            await tools.click('button:has-text("JOIN")');
            await tools.takeScreenshot('after_join');
            
            // Wait for game table to load
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Look for and click available action buttons
            const actionButtons = ['CALL', 'FOLD', 'RAISE', 'CHECK'];
            for (const action of actionButtons) {
                try {
                    await tools.click(`button:has-text("${action}")`);
                    await tools.takeScreenshot(`after_${action.toLowerCase()}`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    console.log(`Button ${action} not available`);
                }
            }
            
            // Take final screenshot
            await tools.takeScreenshot('final_state');
        } else if (argv._.includes('browser')) {
            await tools.navigateTo(argv.url!);

            switch (argv.action) {
                case 'click':
                    if (!argv.selector) {
                        throw new Error('Selector is required for click action');
                    }
                    await tools.click(argv.selector);
                    break;
                case 'type':
                    if (!argv.selector || !argv.value) {
                        throw new Error('Selector and value are required for type action');
                    }
                    await tools.fill(argv.selector, argv.value);
                    break;
                case 'login':
                    if (!argv.username || !argv.password) {
                        throw new Error('Username and password are required for login action');
                    }
                    await tools.login(argv.username, argv.password);
                    break;
                default:
                    throw new Error(`Unsupported action: ${argv.action}`);
            }

            // Keep the browser open for 5 seconds after the last action
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    } catch (error: any) {
        console.error('Error:', error?.message || 'Unknown error');
        process.exit(1);
    } finally {
        await tools.close();
    }
}

main().catch((error: any) => {
    console.error('Error:', error?.message || 'Unknown error');
    process.exit(1);
});
