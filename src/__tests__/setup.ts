// Jest setup file

// Mock React Native modules
// It's often better to rely on explicit mocks in __mocks__ directory
// but you can put global mocks here if needed.
// jest.mock('react-native');
// jest.mock('react-native-blob-util');

// Mock native modules specific to your tests if necessary
// jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock console methods to prevent test output pollution and allow spying
// beforeEach(() => {
//   jest.spyOn(console, 'log').mockImplementation(() => {});
//   jest.spyOn(console, 'debug').mockImplementation(() => {});
//   jest.spyOn(console, 'warn').mockImplementation(() => {});
//   jest.spyOn(console, 'error').mockImplementation(() => {});
// });

// afterEach(() => {
//   // Restore console mocks if spied upon in beforeEach
//   jest.restoreAllMocks();
// });

// Global test settings
// e.g., set default timeout
// jest.setTimeout(10000); // 10 seconds

// Add any other global setup needed for your tests
console.log('Jest setup file loaded.');
