const mockFs = {
  dirs: {
    DocumentDir: '/mock/document/dir',
    CacheDir: '/mock/cache/dir',
    MainBundleDir: '/mock/bundle/dir',
  },
  exists: jest.fn(),
  mkdir: jest.fn(),
  appendFile: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  unlink: jest.fn(),
  ls: jest.fn(),
  stat: jest.fn(),
};

export default {
  fs: mockFs,
};
