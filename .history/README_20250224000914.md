# Automated Testing Framework

This is an automated testing tool using Playwright. The tool allows you to verify the functionality of your web application automatically.

## System Requirements

- Node.js (version 18 or higher)
- npm (version 9 or higher)

## Installation

```bash
# Clone the project
git clone https://github.com/Yosi2377/new-web-test-cursor.git
cd new-web-test-cursor
npm install

# Install Playwright
npx playwright install chromium
```

## Usage

Run the tests:

```bash
# Run all tests
npm run test

# Run tests with development server
npm run test:e2e
```

## Configuration

You can configure the testing settings in the `test-config.json` file:

```json
{
  "baseUrl": "http://localhost:5173",
  "username": "your_username",
  "password": "your_password",
  "roomId": "room_id",
  "screenshotDir": "Screenshots",
  "timeout": 30000
}
```

## Project Structure

```
├── src/
│   └── utils/
│       ├── errorHandler.js    # Error handling
│       └── gameAnalyzer.js    # Game state analysis
├── game-test.js              # Game tests
├── run-test.js              # Run tests
├── test-config.json         # Configuration
└── package.json             # Project dependencies
```

## Features

- Automatic login verification
- Room joining verification
- Game moves verification
- Automatic screenshots
- Game state analysis
- Error handling
- Automatic table positioning correction

## Bug Reporting

If you find a bug, please open a new [issue](https://github.com/Yosi2377/new-web-test-cursor/issues) with:
1. A description of the problem
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Screenshots (if relevant)

## License

MIT
