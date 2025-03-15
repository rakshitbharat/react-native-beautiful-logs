// Simple build validation script
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// First clean and rebuild
console.log('🏗️ Cleaning and rebuilding...');
spawnSync('npm', ['run', 'clean'], { stdio: 'inherit' });
spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });

// Now test the build
try {
  console.log('\n🧪 Testing build output...');
  
  // Check if lib directory exists
  const libDir = path.resolve(__dirname, '../lib');
  if (!fs.existsSync(libDir)) {
    throw new Error('lib directory not found! Build may have failed.');
  }

  // Try to import the built files
  const libModule = await import('../lib/index.js');
  const { Logger, utils } = libModule;
  
  // Validate exports
  if (typeof Logger !== 'function') {
    throw new Error('Logger class not exported correctly');
  }
  
  if (typeof utils !== 'object') {
    throw new Error('utils object not exported correctly');
  }
  
  if (typeof utils.formatMessage !== 'function') {
    throw new Error('utils.formatMessage function not exported correctly');
  }

  // Test Logger instantiation
  const instance = Logger.getInstance();
  if (!(instance instanceof Logger)) {
    throw new Error('Failed to instantiate Logger');
  }

  // All tests passed
  console.log('✅ Build validation successful! All exports working correctly.');
  process.exit(0);

} catch (error) {
  console.error('❌ Build validation failed:', error.message);
  process.exit(1);
}