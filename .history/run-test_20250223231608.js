import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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