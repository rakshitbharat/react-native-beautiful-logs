import { Logger } from '../Logger';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Platform } from 'react-native';

const TIMEOUT = 10000; // 10 seconds

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: jest.SpyInstance;
  const mockFs = (ReactNativeBlobUtil as any).fs;
  const testDate = new Date('2024-03-14T12:00:00Z');

  // Setup default paths
  const DOCUMENT_DIR = '/mock/document/dir';
  const CACHE_DIR = '/mock/cache/dir';
  const LOG_DIR = `${DOCUMENT_DIR}/logs`;
  const SESSION_FILE = `${LOG_DIR}/session_2024-03-14.txt`;
  
  beforeAll(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => testDate.getTime());
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();

    // Setup platform and paths
    (Platform.select as jest.Mock).mockImplementation((obj) => obj.ios);
    mockFs.dirs = {
      DocumentDir: DOCUMENT_DIR,
      CacheDir: CACHE_DIR
    };

    // Setup mock file system responses
    mockFs.exists.mockImplementation((path) => {
      if (path === LOG_DIR) return Promise.resolve(true);
      if (path === DOCUMENT_DIR) return Promise.resolve(true);
      if (path === CACHE_DIR) return Promise.resolve(true);
      if (path === SESSION_FILE) return Promise.resolve(true);
      return Promise.resolve(false);
    });
    
    mockFs.stat.mockResolvedValue({ size: 1024 });
    mockFs.ls.mockResolvedValue(['session_2024-03-14.txt']);
    mockFs.readFile.mockResolvedValue('mock log content');
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.appendFile.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);

    // Reset logger instance before each test
    (Logger as any).instance = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with custom config', () => {
      mockFs.exists.mockResolvedValueOnce(false);
      const customLogger = Logger.getInstance({
        maxLogFiles: 5,
        filters: ['[Test]'],
      });
      expect(customLogger).toBeDefined();
    });

    it('should create log directory if not exists', async () => {
      mockFs.exists.mockImplementationOnce((path) => {
        if (path === LOG_DIR) return Promise.resolve(false);
        return Promise.resolve(true);
      });
      
      logger = Logger.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockFs.mkdir).toHaveBeenCalledWith(LOG_DIR);
    });

    it('should handle storage location unavailable', async () => {
      (Platform.select as jest.Mock).mockReturnValue(undefined);
      logger = Logger.getInstance();
      await logger.log('info', 'Test message');
      expect(console.error).toHaveBeenCalledWith(
        'Storage initialization failed',
        expect.any(Error)
      );
    });

    it('should handle directory creation failure', async () => {
      mockFs.exists.mockResolvedValue(false);
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      logger = Logger.getInstance();
      await logger.log('info', 'Test message');
      expect(console.error).toHaveBeenCalledWith(
        'Storage initialization failed',
        expect.any(Error)
      );
    });

    it('should handle initialization failures', async () => {
      mockFs.exists.mockRejectedValue(new Error('Storage unavailable'));
      logger = Logger.getInstance();
      await logger.log('info', 'Test message');
      expect(console.error).toHaveBeenCalledWith(
        'Storage initialization failed',
        expect.any(Error)
      );
    }, TIMEOUT);
  });

  describe('log operations', () => {
    beforeEach(async () => {
      logger = Logger.getInstance({
        maxLogFiles: 2,
        maxLogSizeMB: 1,
        logRetentionDays: 7,
        filters: ['[FilteredModule]'],
      });
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should log messages with correct level', async () => {
      mockFs.exists.mockResolvedValue(true);
      mockFs.mkdir.mockResolvedValue(undefined);
      logger = Logger.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization

      await logger.log('debug', 'Debug message');
      expect(console.debug).toHaveBeenCalled();

      await logger.log('info', 'Info message');
      expect(console.log).toHaveBeenCalled();

      await logger.log('warn', 'Warning message');
      expect(console.warn).toHaveBeenCalled();

      await logger.log('error', 'Error message');
      expect(console.error).toHaveBeenCalled();
    });

    it('should filter messages based on config', async () => {
      mockFs.appendFile.mockClear();
      await logger.log('[FilteredModule]', 'Should not log');
      expect(console.log).not.toHaveBeenCalled();
      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });

    it('should handle objects and arrays', async () => {
      mockFs.appendFile.mockClear();
      const testObj = { key: 'value' };
      const testArray = [1, 2, 3];
      
      await logger.log('info', 'Test object:', testObj);
      await logger.log('info', 'Test array:', testArray);
      
      expect(console.log).toHaveBeenCalledTimes(2);
      expect(mockFs.appendFile).toHaveBeenCalledTimes(2);
    });

    it('should handle filter patterns', async () => {
      await logger.log('info', '[FilteredModule] test');
      expect(mockFs.appendFile).not.toHaveBeenCalled();
      
      await logger.log('info', 'normal message');
      expect(mockFs.appendFile).toHaveBeenCalled();
    });

    it('should format objects and arrays correctly', async () => {
      const testObj = { test: 'value' };
      const testArray = [1, 2, 3];
      
      await logger.log('info', 'Object:', testObj, 'Array:', testArray);
      expect(mockFs.appendFile).toHaveBeenCalledTimes(1);
      expect(mockFs.appendFile.mock.calls[0][1]).toContain('"test": "value"');
      expect(mockFs.appendFile.mock.calls[0][1]).toContain('[1,2,3]');
    });

    it('should handle null and undefined values', async () => {
      await logger.log('info', null, undefined);
      expect(mockFs.appendFile).toHaveBeenCalled();
      const logMessage = mockFs.appendFile.mock.calls[0][1];
      expect(logMessage).toContain('null undefined');
    });
  });

  describe('file operations', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      mockFs.exists.mockImplementation((path) => {
        if (path === LOG_DIR) return Promise.resolve(true);
        if (path === DOCUMENT_DIR) return Promise.resolve(true);
        if (path === SESSION_FILE) return Promise.resolve(true);
        return Promise.resolve(false);
      });
    });

    it('should create log directory if not exists', async () => {
      mockFs.exists.mockImplementation((path) => {
        if (path === LOG_DIR) return Promise.resolve(false);
        if (path === DOCUMENT_DIR) return Promise.resolve(true);
        return Promise.resolve(false);
      });
      
      logger = Logger.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization
      await logger.log('info', 'Test message');
      
      expect(mockFs.mkdir).toHaveBeenCalledWith(LOG_DIR);
    }, TIMEOUT);

    it('should handle file system errors gracefully', async () => {
      logger = Logger.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization
      
      const writeError = new Error('Write error');
      mockFs.appendFile.mockRejectedValueOnce(writeError);
      await logger.log('info', 'Test message');
      expect(console.error).toHaveBeenCalledWith('Error writing to log file:', writeError);
    }, TIMEOUT);

    it('should use correct file path based on platform', async () => {
      // Test Android path
      (Platform.select as jest.Mock).mockImplementation((obj) => obj.android);
      const androidLogger = Logger.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization
      await androidLogger.log('info', 'Test message');
      
      expect(mockFs.appendFile.mock.calls[0][0]).toContain(CACHE_DIR);

      // Test iOS path
      jest.clearAllMocks();
      (Logger as any).instance = undefined;
      (Platform.select as jest.Mock).mockImplementation((obj) => obj.ios);
      
      const iosLogger = Logger.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization
      await iosLogger.log('info', 'Test message');
      
      expect(mockFs.appendFile.mock.calls[0][0]).toContain(DOCUMENT_DIR);
    }, TIMEOUT);

    it('should handle base64 encoding fallback', async () => {
      logger = Logger.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization
      
      const utf8Error = new Error('UTF-8 write failed');
      mockFs.appendFile
        .mockImplementationOnce(() => Promise.reject(utf8Error))
        .mockImplementationOnce((path, data, encoding) => {
          expect(encoding).toBe('base64');
          return Promise.resolve();
        });

      await logger.log('info', 'Test message');
      expect(mockFs.appendFile).toHaveBeenCalledTimes(2);
    }, TIMEOUT);
    
    it('should handle initialization failures', async () => {
      mockFs.exists.mockRejectedValue(new Error('Storage unavailable'));
      logger = Logger.getInstance();
      await logger.log('info', 'Test message');
      expect(console.error).toHaveBeenCalledWith(
        'Storage initialization failed',
        expect.any(Error)
      );
    }, TIMEOUT);

    it('should handle log rotation with file deletion errors', async () => {
      logger = Logger.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization
      
      const deleteError = new Error('Delete failed');
      mockFs.stat.mockResolvedValue({ size: 2 * 1024 * 1024 }); // 2MB file
      mockFs.ls.mockResolvedValue(['old.txt']);
      mockFs.unlink.mockRejectedValue(deleteError);
      
      await logger.log('info', 'Test message');
      expect(console.error).toHaveBeenCalledWith(
        'Error deleting log file:',
        deleteError
      );
    }, TIMEOUT);

    it('should handle concurrent write operations', async () => {
      logger = Logger.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization
      jest.clearAllMocks();
      
      const writePromises = [
        logger.log('info', 'Message 1'),
        logger.log('info', 'Message 2'),
        logger.log('info', 'Message 3')
      ];
      
      await Promise.all(writePromises);
      expect(mockFs.appendFile).toHaveBeenCalledTimes(3);
    }, TIMEOUT);

    it('should handle cleanup of non-existent files', async () => {
      logger = Logger.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization
      mockFs.exists.mockResolvedValue(false);
      
      await logger.loggerInterface.deleteLogFile('nonexistent.txt');
      expect(mockFs.unlink).not.toHaveBeenCalled();
    }, TIMEOUT);

    it('should retry file operations on transient errors', async () => {
      logger = Logger.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization
      
      mockFs.appendFile
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce(undefined);
      
      await logger.log('info', 'Test message');
      expect(mockFs.appendFile).toHaveBeenCalledTimes(2);
    }, TIMEOUT);

    it('should handle log file cleanup on rotation', async () => {
      logger = Logger.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization
      
      mockFs.stat.mockResolvedValue({ size: 2 * 1024 * 1024 }); // 2MB file
      mockFs.ls.mockResolvedValue(['session_1.txt', 'session_2.txt', 'session_3.txt']);
      
      await logger.log('info', 'Test message');
      expect(mockFs.unlink).toHaveBeenCalled();
    }, TIMEOUT);

    it('should use correct platform paths', async () => {
      // Test Android path
      (Platform.select as jest.Mock).mockImplementation((obj) => obj.android);
      (Logger as any).instance = undefined;
      const androidLogger = Logger.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      mockFs.exists.mockResolvedValue(true);
      await androidLogger.log('info', 'Android test');
      
      const androidCalls = mockFs.appendFile.mock.calls;
      expect(androidCalls[androidCalls.length - 1][0]).toContain(CACHE_DIR);

      // Test iOS path
      jest.clearAllMocks();
      (Logger as any).instance = undefined;
      (Platform.select as jest.Mock).mockImplementation((obj) => obj.ios);
      
      const iosLogger = Logger.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100));
      await iosLogger.log('info', 'iOS test');
      
      const iosCalls = mockFs.appendFile.mock.calls;
      expect(iosCalls[iosCalls.length - 1][0]).toContain(DOCUMENT_DIR);
    });

    it('should handle write errors with encoding fallback', async () => {
      const writeError = new Error('UTF-8 write failed');
      mockFs.appendFile
        .mockRejectedValueOnce(writeError)
        .mockImplementationOnce((path, data, encoding) => {
          expect(encoding).toBe('base64');
          return Promise.resolve();
        });

      await logger.log('info', 'Test message');
      expect(mockFs.appendFile).toHaveBeenCalledTimes(2);
    });

    it('should handle log rotation', async () => {
      mockFs.stat.mockResolvedValue({ size: 2 * 1024 * 1024 }); // 2MB
      mockFs.ls.mockResolvedValue([
        'session_2024-03-12.txt',
        'session_2024-03-13.txt',
        'session_2024-03-14.txt'
      ]);

      await logger.log('info', 'Trigger rotation');
      
      expect(mockFs.unlink).toHaveBeenCalled();
      const deletedFile = mockFs.unlink.mock.calls[0][0];
      expect(deletedFile).toContain('session_2024-03-12.txt');
    });

    it('should handle concurrent log operations', async () => {
      const promises = Array(5).fill(0).map((_, i) => 
        logger.log('info', `Message ${i}`)
      );

      await Promise.all(promises);
      expect(mockFs.appendFile).toHaveBeenCalledTimes(5);
    });

    it('should handle file deletion errors', async () => {
      mockFs.stat.mockResolvedValue({ size: 2 * 1024 * 1024 });
      mockFs.ls.mockResolvedValue(['old.txt']);
      mockFs.unlink.mockRejectedValue(new Error('Delete failed'));
      
      await logger.log('info', 'Test message');
      expect(console.error).toHaveBeenCalledWith(
        'Error deleting log file:',
        expect.any(Error)
      );
    });
  });

  describe('loggerInterface', () => {
    beforeEach(async () => {
      logger = Logger.getInstance();
      // Wait for initialization
      await Promise.resolve();
    });

    it('should list log files', async () => {
      const files = await logger.loggerInterface.getLogFiles();
      expect(mockFs.ls).toHaveBeenCalled();
      expect(files).toEqual(['session_2024-03-14.txt']);
    });

    it('should cleanup old logs', async () => {
      mockFs.ls.mockResolvedValueOnce([
        'session_2024-03-01.txt',
        'session_2024-03-14.txt'
      ]);
      
      await logger.loggerInterface.deleteAllLogs();
      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it('should handle cleanup failures', async () => {
      mockFs.unlink.mockRejectedValueOnce(new Error('Delete failed'));
      await logger.loggerInterface.deleteAllLogs();
      expect(console.error).toHaveBeenCalled();
    });

    it('should list log files', async () => {
      const testFiles = ['file1.txt', 'file2.txt'];
      mockFs.ls.mockResolvedValue(testFiles);
      
      const files = await logger.loggerInterface.getLogFiles();
      expect(files).toEqual(testFiles);
    });

    it('should handle list files error', async () => {
      mockFs.ls.mockRejectedValue(new Error('List failed'));
      
      const files = await logger.loggerInterface.getLogFiles();
      expect(files).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Error listing log files:',
        expect.any(Error)
      );
    });

    it('should delete specific log file', async () => {
      mockFs.exists.mockResolvedValue(true);
      await logger.loggerInterface.deleteLogFile('test.txt');
      
      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('test.txt')
      );
    });

    it('should handle delete file error', async () => {
      mockFs.exists.mockResolvedValue(true);
      mockFs.unlink.mockRejectedValue(new Error('Delete failed'));
      
      await logger.loggerInterface.deleteLogFile('test.txt');
      expect(console.error).toHaveBeenCalledWith(
        'Error deleting log file:',
        expect.any(Error)
      );
    });

    it('should cleanup all logs', async () => {
      const testFiles = ['file1.txt', 'file2.txt'];
      mockFs.ls.mockResolvedValue(testFiles);
      mockFs.exists.mockResolvedValue(true);
      
      await logger.loggerInterface.deleteAllLogs();
      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
    });

    it('should handle cleanup errors', async () => {
      mockFs.ls.mockRejectedValue(new Error('Cleanup failed'));
      
      await logger.loggerInterface.deleteAllLogs();
      expect(console.error).toHaveBeenCalledWith(
        'Error deleting log files:',
        expect.any(Error)
      );
    });
  });
});