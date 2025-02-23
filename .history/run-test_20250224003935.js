import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const {
    initializeBrowser,
    login,
    sleep,
    takeScreenshot,
    analyzeScreenshotAndDecideAction,
    checkAndFixElementPosition
} = require('./game-test');

const config = {
    headless: false,
    url: 'https://example.com',
    username: 'testuser',
    password: 'testpass',
    screenshotDelay: 2000,
    maxRetries: 3
};

// Start the dev server
console.log('Starting development server...');
const devServer = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true
});

let serverStarted = false;

// Listen for server output
devServer.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    
    // Check if server is ready
    if (output.includes('Local:') && !serverStarted) {
        serverStarted = true;
        console.log('\nDevelopment server is ready. Starting tests...\n');
        
        // Run the test script
        const test = spawn('npm', ['test'], {
            stdio: 'inherit',
            shell: true
        });
        
        test.on('close', (code) => {
            console.log(`Test process exited with code ${code}`);
            // Kill the dev server
            devServer.kill();
            process.exit(code);
        });
    }
});

devServer.stderr.on('data', (data) => {
    console.error(data.toString());
});

devServer.on('close', (code) => {
    if (!serverStarted) {
        console.error('Development server failed to start');
        process.exit(1);
    }
});

/**
 * Main test execution function
 */
async function runTest() {
    try {
        // Initialize browser
        const { browser, page } = await initializeBrowser(config);
        console.log('Browser initialized');

        // Perform login
        await login(page, config.url, config.username, config.password);
        console.log('Login successful');

        // Example test sequence
        await sleep(config.screenshotDelay);
        await takeScreenshot(page, 'initial_state');
        
        // Check and fix element positions if needed
        const elementFixed = await checkAndFixElementPosition(page, '#target-element');
        if (elementFixed) {
            console.log('Element position adjusted');
            await takeScreenshot(page, 'after_position_fix');
        }

        // Analyze screenshot and take action
        const analysis = await analyzeScreenshotAndDecideAction('Screenshots/initial_state.png');
        console.log('Screenshot analysis:', analysis);

        // Example of handling analysis results
        if (analysis.recommendedAction === 'retry') {
            console.log('Retrying action due to error...');
            // Add retry logic here
        }

        // Cleanup
        await browser.close();
        console.log('Test completed successfully');

    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Run the test
runTest().catch(console.error); 