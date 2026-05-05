const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Read the index.html file
const htmlPath = path.join(__dirname, '../index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// Extract APP_STORAGE_KEY
const appStorageKeyMatch = htmlContent.match(/const APP_STORAGE_KEY = '([^']+)';/);
if (!appStorageKeyMatch) {
    throw new Error('Could not find APP_STORAGE_KEY');
}
const APP_STORAGE_KEY = appStorageKeyMatch[1];

// Create a mock for localStorage
global.localStorage = {
    store: {},
    getItem: function(key) {
        return this.store[key] || null;
    },
    setItem: function(key, value) {
        this.store[key] = String(value);
    },
    removeItem: function(key) {
        delete this.store[key];
    },
    clear: function() {
        this.store = {};
    }
};

// Extract the saveState function
const saveStateMatch = htmlContent.match(/function saveState\s*\([^)]*\)\s*\{([^}]*)\}/);
if (!saveStateMatch) {
    throw new Error('Could not find saveState function in index.html');
}

// Create the function using new Function
// Note: new Function expects the argument names as the first parameters, then the body
const saveState = new Function('state', saveStateMatch[1]);

// Test cases
function runTests() {
    console.log('Running tests for saveState...');

    // Setup global context for the function. It references APP_STORAGE_KEY globally.
    global.APP_STORAGE_KEY = APP_STORAGE_KEY;

    // Clear localStorage mock before test
    global.localStorage.clear();

    // Test Case 1: Happy path - storing a normal state object
    const mockState = { userSettings: { maxCalories: 2000 }, foodLibrary: {} };
    saveState(mockState);
    const saved = global.localStorage.getItem(global.APP_STORAGE_KEY);
    assert.strictEqual(saved, JSON.stringify(mockState), 'State should be correctly serialized and saved to localStorage');

    // Test Case 2: Edge case - storing an empty object
    saveState({});
    assert.strictEqual(global.localStorage.getItem(global.APP_STORAGE_KEY), JSON.stringify({}), 'Should correctly serialize empty object');

    // Test Case 3: Edge case - storing an array (though unusual for this app, it's valid JSON)
    const arrayState = [1, 2, 3];
    saveState(arrayState);
    assert.strictEqual(global.localStorage.getItem(global.APP_STORAGE_KEY), JSON.stringify(arrayState), 'Should correctly serialize an array');

    // Test Case 4: Edge case - null
    saveState(null);
    assert.strictEqual(global.localStorage.getItem(global.APP_STORAGE_KEY), "null", 'Should correctly serialize null');

    console.log('✅ saveState successfully stores state in localStorage');
}

try {
    runTests();
} catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
}
