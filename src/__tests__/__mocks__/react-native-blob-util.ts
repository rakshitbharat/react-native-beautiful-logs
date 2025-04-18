// Simple in-memory filesystem mock for testing purposes
import { ReactNativeBlobUtilStat } from 'react-native-blob-util'; // Import actual Stat type

let mockFiles: Record<string, string> = {}; // path -> content
// Define a simpler type for mock stats, potentially union with real type or directory type
type MockDirectoryStat = {
  type: 'directory';
  path: string;
  filename: string | undefined;
  size: number;
  lastModified: number;
};
type MockStat = ReactNativeBlobUtilStat | MockDirectoryStat; // Allow real Stat or our directory mock
let mockStats: Record<string, MockStat> = {}; // path -> stat object
let mockDirs: Set<string> = new Set(); // Existing directories

export const mockFs = {
  dirs: {
    DocumentDir: '/mock/documents',
    CacheDir: '/mock/cache',
    MainBundleDir: '/mock/bundle', // Less commonly used for writing
    // Add other dirs if needed
  },
  exists: jest.fn(async (path: string): Promise<boolean> => {
    return path in mockFiles || mockDirs.has(path);
  }),
  mkdir: jest.fn(async (path: string): Promise<void> => {
    if (mockDirs.has(path)) {
      // Optional: Throw error if already exists? Or just allow? Let's allow.
      // throw new Error(`Directory already exists: ${path}`);
    }
    // Create parent directories if they don't exist? Simple mock assumes parent exists.
    mockDirs.add(path);
    // Also add to mockStats as a directory type
    mockStats[path] = {
      type: 'directory',
      path: path,
      filename: path.split('/').pop() || '',
      size: 0,
      lastModified: Date.now(),
    };
  }),
  writeFile: jest.fn(
    async (
      path: string,
      data: string | number[],
      encoding: 'utf8' | 'base64' | 'ascii' = 'utf8',
    ): Promise<void> => {
      const parentDir = path.substring(0, path.lastIndexOf('/'));
      if (parentDir && !mockDirs.has(parentDir) && !(parentDir in mockFiles)) {
        // Check if parent 'directory' actually points to a file
        if (parentDir in mockFiles) {
          throw new Error(`Cannot write file. Parent path is a file: ${parentDir}`);
        }
        // Simple mock doesn't auto-create parent dirs, real library might
        // throw new Error(`Parent directory does not exist: ${parentDir}`);
        // For testing, let's assume parent exists if we call writeFile
      }

      let content: string;
      if (typeof data === 'string') {
        if (encoding === 'base64') {
          content = Buffer.from(data, 'base64').toString('utf8');
        } else {
          content = data;
        }
      } else {
        // Handle number[] data if needed
        content = Buffer.from(data).toString(encoding);
      }
      mockFiles[path] = content;
      mockStats[path] = {
        type: 'file', // Use 'file' type from ReactNativeBlobUtilStat
        size: content.length, // Simple size calculation
        lastModified: Date.now(),
        path: path,
        filename: path.split('/').pop() || '', // Ensure filename is always string
      };
      mockDirs.delete(path); // Ensure it's not marked as a directory if we write a file there
    },
  ),
  appendFile: jest.fn(
    async (
      path: string,
      data: string | number[],
      encoding: 'utf8' | 'base64' | 'ascii' = 'utf8',
    ): Promise<void> => {
      const existingContent = mockFiles[path] || '';
      let appendContent: string;
      if (typeof data === 'string') {
        if (encoding === 'base64') {
          appendContent = Buffer.from(data, 'base64').toString('utf8');
        } else {
          appendContent = data;
        }
      } else {
        appendContent = Buffer.from(data).toString(encoding);
      }
      const newContent = existingContent + appendContent;
      mockFiles[path] = newContent;
      mockStats[path] = {
        ...(mockStats[path] || { type: 'file', path: path, filename: path.split('/').pop() || '' }), // Use 'file'
        size: newContent.length,
        lastModified: Date.now(),
      } as MockStat; // Assert type
      mockDirs.delete(path); // Ensure it's not marked as a directory
    },
  ),
  readFile: jest.fn(
    async (
      path: string,
      encoding: 'utf8' | 'base64' | 'ascii' = 'utf8',
    ): Promise<string | number[]> => {
      if (!(path in mockFiles)) {
        throw new Error(`File does not exist: ${path}`);
      }
      const content = mockFiles[path];
      if (encoding === 'utf8') {
        return content;
      } else if (encoding === 'base64') {
        return Buffer.from(content, 'utf8').toString('base64');
      } else if (encoding === 'ascii') {
        return Buffer.from(content, 'utf8').toString('ascii');
      }
      // Add number[] return type if needed based on usage
      return content; // Default fallback
    },
  ),
  stat: jest.fn(async (path: string): Promise<MockStat | undefined> => {
    // Return type includes undefined
    if (path in mockStats) {
      // Return a copy - ensure type compatibility
      const stats = mockStats[path];
      // Check if it's the real type or our mock directory type
      if (stats.type === 'directory') {
        return { ...stats } as MockDirectoryStat;
      } else if (stats.type === 'file') {
        return { ...stats } as ReactNativeBlobUtilStat;
      }
      // Fallback for safety, though should be one of the above
      return { ...stats } as MockStat;
    }
    if (mockDirs.has(path)) {
      // Should have been caught by mockStats check, but keep as fallback
      return {
        type: 'directory',
        path: path,
        filename: path.split('/').pop() || '',
        size: 0,
        lastModified: 0, // Use a consistent value
      };
    }
    // Return undefined instead of throwing for stat calls on non-existent files
    // throw new Error(`File or directory does not exist: ${path}`);
    return undefined;
  }),
  ls: jest.fn(async (path: string): Promise<string[]> => {
    if (!mockDirs.has(path) && !(path in mockFiles && mockStats[path]?.type === 'directory')) {
      // Check if path is a known directory
      // Real ls might throw or return empty? Let's return empty for missing dir.
      // throw new Error(`Directory does not exist: ${path}`);
      return [];
    }
    const items: string[] = [];
    const prefix = path === '/' ? '/' : `${path}/`; // Handle root path listing correctly
    Object.keys(mockFiles).forEach(filePath => {
      if (filePath.startsWith(prefix) && filePath.substring(prefix.length).indexOf('/') === -1) {
        items.push(filePath.substring(prefix.length));
      }
    });
    mockDirs.forEach(dirPath => {
      if (dirPath.startsWith(prefix) && dirPath.substring(prefix.length).indexOf('/') === -1) {
        items.push(dirPath.substring(prefix.length));
      }
    });
    return [...new Set(items)]; // Deduplicate just in case
  }),
  unlink: jest.fn(async (path: string): Promise<void> => {
    if (path in mockFiles) {
      delete mockFiles[path];
      delete mockStats[path];
    } else if (mockDirs.has(path)) {
      // Should we allow deleting directories? RNFetchBlob unlink might only work on files.
      // Let's assume it deletes files primarily.
      // If directory deletion needed, use rmdir (if mock implements it)
      // Silently ignore attempts to unlink directories for now, or throw:
      // throw new Error(`Path is a directory, use rmdir: ${path}`);
      delete mockDirs.delete(path);
      delete mockStats[path];
    } else {
      // Optional: Throw error if file doesn't exist? Or silently succeed?
      // Real unlink often doesn't error if file is missing.
      // throw new Error(`File does not exist: ${path}`);
    }
  }),
  // Add other methods like session, config, etc. if needed and mock their behavior
};

// Helper function to reset the mock state between tests
export const resetMockState = () => {
  mockFiles = {};
  mockStats = {};
  mockDirs = new Set();
};

export default {
  fs: mockFs,
  // Mock other main exports if needed
};
