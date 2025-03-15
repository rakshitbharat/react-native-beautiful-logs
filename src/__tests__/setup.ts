/// <reference types="jest" />

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
}));

// Mock react-native-blob-util
jest.mock('react-native-blob-util', () => ({
  fs: {
    dirs: {
      DocumentDir: '/mock/document/dir',
      CacheDir: '/mock/cache/dir',
      MainBundleDir: '/mock/bundle/dir',
    },
    exists: jest.fn<Promise<boolean>, [string]>(),
    mkdir: jest.fn<Promise<void>, [string]>(),
    appendFile: jest.fn<Promise<void>, [string, string, string]>(),
    writeFile: jest.fn<Promise<void>, [string, string, string]>(),
    readFile: jest.fn<Promise<string>, [string, string]>(),
    unlink: jest.fn<Promise<void>, [string]>(),
    ls: jest.fn<Promise<string[]>, [string]>(),
    stat: jest.fn<Promise<{ size: number }>, [string]>(),
  },
}));