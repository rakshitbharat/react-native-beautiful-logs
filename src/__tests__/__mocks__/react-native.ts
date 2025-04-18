export const Platform = {
  OS: 'ios', // Default mock OS
  select: jest.fn(spec => {
    return Platform.OS in spec ? spec[Platform.OS] : spec.default;
  }),
  // Add other Platform properties if needed by the code under test
};

export const Dimensions = {
  get: jest.fn().mockReturnValue({ width: 375, height: 667 }),
  // Add other Dimensions methods/properties if needed
};

// Mock other RN modules as needed by your component tree or utility functions
export const StyleSheet = {
  create: jest.fn(styles => styles),
  // Add other StyleSheet properties if needed
};

// Add mocks for any other React Native APIs used directly or indirectly
// export const NativeModules = {};
// export const DeviceEventEmitter = { addListener: jest.fn(), removeListener: jest.fn() };

// Export default for compatibility if needed, though named exports are standard
export default {
  Platform,
  Dimensions,
  StyleSheet,
  // ... other mocks
};
