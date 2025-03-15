import { log, debug, info, warn, error } from '../index';
import { formatMessage } from '../utils';
import { DEFAULT_CONFIG } from '../constants';
import { getDateString } from '../utils';

// This test is for demonstration purposes only
// It shows how the logs appear in the terminal
describe('Logger Demo', () => {
  // Disable mocks for this test to see actual output
  beforeAll(() => {
    jest.unmock('react-native');
    jest.unmock('react-native-blob-util');
  });

  afterAll(() => {
    // Re-enable mocks after this test
    jest.resetModules();
  });

  // This test will output logs to console but won't make assertions
  it('demonstrates various log types and formatting', async () => {
    console.log('\n\n' + '='.repeat(80));
    console.log('  🚀 REACT NATIVE BEAUTIFUL LOGS - DEMO');
    console.log('='.repeat(80) + '\n');
    
    // Show direct console output of formatMessage to demonstrate colors
    const config = DEFAULT_CONFIG;
    
    // Add a header for each section
    const showHeader = (title) => {
      console.log('\n' + '▓'.repeat(60));
      console.log(`  ${title}`);
      console.log('▓'.repeat(60) + '\n');
    };
    
    showHeader('🌈 BASIC LOG LEVELS');
    
    // Colorful examples (these will show colors in terminal)
    console.log(formatMessage('debug', ['This is a debug message'], config));
    console.log(formatMessage('info', ['This is an info message'], config));
    console.log(formatMessage('warn', ['This is a warning message'], config));
    console.log(formatMessage('error', ['This is an error message'], config));
    
    // Now use the actual logger to show how it appears in real usage
    showHeader('📌 MODULE-BASED LOGGING');
    
    // Module-based logging
    await log('[AuthService]', 'User authenticated successfully');
    await log('[ApiClient]', 'GET request to /users completed');
    await log('[NavigationService]', 'Navigating to Home screen');
    await warn('[PermissionsManager]', 'Camera permission was denied');
    
    showHeader('📊 OBJECT LOGGING');
    
    // Simple object
    const user = {
      id: 1234,
      name: 'Jane Doe',
      email: 'jane@example.com',
      isActive: true,
      loginCount: 42
    };
    await info('User profile:', user);
    
    // Nested objects
    const apiResponse = {
      status: 200,
      data: {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 42
        }
      },
      meta: {
        requestId: 'abc-123-xyz',
        processingTime: '120ms'
      }
    };
    await log('[ApiClient]', 'Response received:', apiResponse);
    
    // Error objects
    try {
      throw new Error('Something went wrong');
    } catch (err) {
      await error('[ErrorHandler]', 'Caught exception:', err);
    }
    
    showHeader('🔄 MIXED CONTENT LOGGING');
    
    // Mixed content
    const stats = {
      memory: '120MB',
      cpu: '5%',
      battery: '85%',
      temperature: '38°C'
    };
    await info(
      '[PerformanceMonitor]',
      'Performance stats:',
      stats,
      'Network status:',
      'Connected'
    );
    
    // Array logging
    const recentSearches = ['React Native', 'TypeScript', 'JavaScript', 'Mobile Development'];
    await debug('[SearchService]', 'Recent searches:', recentSearches);
    
    // Null and undefined
    await warn('[ConfigService]', 'Config value is missing:', null, undefined);
    
    showHeader('📝 STYLED OUTPUT WITH CODE SAMPLES');
    
    // Code-like structures
    const codeExample = `
function greet(name) {
  return \`Hello, \${name}!\`;
}
    `;
    await info('[Documentation]', 'Example code:', codeExample);
    
    // Long text with special characters
    await log(
      '[i18n]',
      'Translation with special characters: こんにちは世界, привет мир, مرحبا بالعالم'
    );
    
    // Date and time formatting
    const now = new Date();
    await log(
      '[DateService]',
      `Current date is ${getDateString(now)} and time is ${now.toLocaleTimeString()}`
    );
    
    showHeader('⚙️ EXAMPLE USE CASES');
    
    // API request logging
    await log('[API]', 'GET', '/users/123', 'Request started');
    await info('[API]', 'GET', '/users/123', 'Response received in 230ms');
    
    // Error handling
    await error(
      '[ErrorBoundary]',
      'Failed to render component',
      { component: 'UserProfile', props: { userId: 123 } }
    );
    
    // Application flow
    await log('[AppState]', 'Application entered background');
    await log('[AppState]', 'Application returned to foreground');
    
    // Authentication flow
    await info('[Auth]', 'User login attempt');
    await warn('[Auth]', 'Multiple failed login attempts detected', { username: 'user@example.com', attempts: 3 });
    await info('[Auth]', 'Password reset email sent');
    
    showHeader('📱 REACT NATIVE SPECIFIC LOGS');
    
    // Navigation events
    await log('[Navigation]', 'User navigated to HomeScreen');
    await debug('[Navigation]', 'Route params:', { userId: 123, view: 'dashboard' });
    
    // Network requests
    await info('[Fetch]', 'GET https://api.example.com/data', 'Starting request...');
    await info('[Fetch]', 'GET https://api.example.com/data', 'Response:', { status: 200, headers: { 'content-type': 'application/json' }});
    
    // Component lifecycle
    await debug('[ProfileScreen]', 'Component mounted');
    await debug('[ProfileScreen]', 'useEffect dependencies changed:', ['userId', 'theme']);
    await debug('[ProfileScreen]', 'Component will unmount');
    
    console.log('\n' + '='.repeat(80));
    console.log('  🎉 END OF DEMONSTRATION');
    console.log('='.repeat(80) + '\n');
    
    // This test doesn't actually test anything, it's just for demonstration
    expect(true).toBeTruthy();
  });
});
