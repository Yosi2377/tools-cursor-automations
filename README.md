# Web Automation Testing Framework

A flexible and generic web automation testing framework built with Puppeteer and Tesseract.js. This framework provides a robust foundation for creating automated tests for any web application.

## Features

- **Browser Automation**: Powered by Puppeteer for reliable web automation
- **OCR Capabilities**: Text recognition from screenshots using Tesseract.js
- **Flexible Configuration**: Easily configurable for different web applications
- **Scenario-based Testing**: Write tests as scenarios with clear steps
- **Screenshot Management**: Automated screenshot capture with analysis
- **Element Position Verification**: Ensures elements are visible and properly positioned
- **Customizable Actions**: Supports various actions including click, type, select, and custom functions
- **Error Handling**: Comprehensive error capture with screenshots

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/web-automation-framework.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Create a `test-config.json` file with your test settings:

```json
{
  "baseUrl": "http://localhost:3000",
  "browser": {
    "headless": false,
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "timeout": 30000
  },
  "auth": {
    "enabled": true,
    "url": "/login",
    "credentials": {
      "username": "testuser",
      "password": "testpass"
    },
    "selectors": {
      "username": "#username",
      "password": "#password",
      "submitButton": "#login-button"
    }
  },
  "screenshots": {
    "enabled": true,
    "directory": "Screenshots",
    "captureOnError": true
  },
  "selectors": {
    "mainContainer": "#root",
    "errorMessage": ".error-message",
    "loadingIndicator": ".loading"
  },
  "actions": {
    "defaultDelay": 1000,
    "maxRetries": 3
  }
}
```

## Usage

### Basic Test Scenario

Create a test scenario in your test file:

```javascript
const scenario = {
  name: 'Login Flow',
  steps: [
    {
      name: 'Enter Username',
      action: 'type',
      selector: '#username',
      value: 'testuser',
      screenshotAfter: true
    },
    {
      name: 'Enter Password',
      action: 'type',
      selector: '#password',
      value: 'testpass'
    },
    {
      name: 'Click Login',
      action: 'click',
      selector: '#login-button',
      screenshotAfter: true,
      validate: async (page) => {
        return await page.$('#dashboard') !== null;
      }
    }
  ]
};
```

### Running Tests

```bash
npm test
```

## Available Functions

### Core Functions

- `initializeBrowser()`: Initializes Puppeteer browser with configured settings
- `login(page)`: Performs authentication if enabled in config
- `takeScreenshot(page, name)`: Captures and saves a screenshot
- `analyzeScreenshot(screenshotPath)`: Performs OCR analysis on a screenshot
- `checkAndFixElementPosition(page, selector)`: Verifies and adjusts element visibility
- `sleep(ms)`: Adds a delay between actions

### Test Runner Functions

- `executeScenario(page, scenario)`: Runs a test scenario
- `runTests()`: Main test execution function
- `loadTestScenarios()`: Loads test scenarios from configuration

## Creating Test Scenarios

Test scenarios are defined as objects with steps:

```javascript
{
  name: 'Scenario Name',
  steps: [
    {
      name: 'Step Name',
      action: 'actionType', // click, type, select, wait, checkPosition, custom
      selector: 'CSS Selector', // for element actions
      value: 'Input Value', // for type/select actions
      screenshotBefore: true, // optional
      screenshotAfter: true, // optional
      validate: async (page) => boolean, // optional validation function
      delay: 1000 // optional delay after action
    }
  ]
}
```

## Supported Actions

- `click`: Click an element
- `type`: Enter text into an input field
- `select`: Choose an option from a select element
- `wait`: Add a delay
- `checkPosition`: Verify and fix element position
- `custom`: Execute a custom function

## Error Handling

The framework includes comprehensive error handling:
- Screenshots on error (if enabled)
- Detailed error logging
- Validation checks after actions
- Retry mechanism for failed actions

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.
