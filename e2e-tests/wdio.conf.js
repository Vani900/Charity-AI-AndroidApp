const path = require('path');

exports.config = {
    // ====================
    // Runner Configuration
    // ====================
    runner: 'local',
    port: 4723, // Default Appium port

    // ==================
    // Specify Test Files
    // ==================
    specs: [
        './src/tests/**/*.test.js'
    ],
    exclude: [],

    // ============
    // Capabilities
    // ============
    maxInstances: 1,
    capabilities: [{
        // Capabilities for local Appium Android execution
        'platformName': 'Android',
        'appium:deviceName': 'Android Emulator',
        'appium:platformVersion': '14.0', // adapt to emulator version
        'appium:automationName': 'UiAutomator2',
        'appium:app': path.resolve(__dirname, '../app-release.apk'),
        'appium:appPackage': 'com.charitychain.mobile', // package name
        'appium:appActivity': 'com.charitychain.mobile.MainActivity',
        'appium:noReset': false,
        'appium:fullReset': false,
        'appium:newCommandTimeout': 240
    }],

    // ===================
    // Test Configurations
    // ===================
    logLevel: 'info',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: ['appium'],
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    }
};
