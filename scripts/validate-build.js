// @ts-check
import { strict as assert } from 'assert';
import { Logger, utils } from '../lib/index.js';

try {
  // Validate basic exports
  assert(typeof Logger === 'function', 'Logger class not exported correctly');
  assert(typeof utils === 'object', 'Utils not exported correctly');
  assert(typeof utils.formatLogEntry === 'function', 'formatLogEntry not exported correctly');

  // Try to instantiate Logger
  const instance = Logger.getInstance();
  assert(instance instanceof Logger, 'Failed to instantiate Logger');

  console.log('✅ Build validation passed - package exports and instantiation working correctly');
  process.exit(0);
} catch (error) {
  console.error('❌ Build validation failed:', error);
  process.exit(1);
}
