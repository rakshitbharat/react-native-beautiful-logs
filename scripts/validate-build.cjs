/* eslint-disable @typescript-eslint/no-var-requires */
const assert = require('node:assert/strict');

(async () => {
  try {
    const { Logger, utils } = await import('../lib/index.js');
    
    // Validate basic exports
    assert(typeof Logger === 'function', 'Logger class not exported correctly');
    assert(typeof utils === 'object', 'Utils not exported correctly');
    assert(typeof utils.formatMessage === 'function', 'formatMessage not exported correctly');
    
    // Try to instantiate Logger
    const instance = Logger.getInstance();
    assert(instance instanceof Logger, 'Failed to instantiate Logger');
    
    console.log('✅ Build validation passed - package exports and instantiation working correctly');
    process.exit(0);
  } catch (error) {
    console.error('❌ Build validation failed:', error);
    process.exit(1);
  }
})();
