import { debug, info, warn, error, log, initLogger, getLoggerInterface } from '../index';
import { Logger } from '../Logger';

// Mock react-native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn(obj => obj.ios),
  },
}));

// Mock Logger class
jest.mock('../Logger', () => {
  class MockLogger {
    log = jest.fn();
    loggerInterface = {
      getLogFiles: jest.fn(),
      getCurrentSessionLog: jest.fn(),
      readLogFile: jest.fn(),
      deleteLogFile: jest.fn(),
      deleteAllLogs: jest.fn(),
      cleanupCurrentSession: jest.fn(),
    };
  }
  const mockInstance = new MockLogger();

  // Make instanceof work
  MockLogger.prototype.constructor = Logger;
  Object.setPrototypeOf(MockLogger.prototype, Logger.prototype);
  Object.setPrototypeOf(mockInstance, MockLogger.prototype);

  return {
    Logger: {
      getInstance: jest.fn(() => mockInstance),
    },
  };
});

describe('Public API', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = Logger.getInstance();
  });

  describe('log level functions', () => {
    it('should call logger with correct level for debug', async () => {
      await debug('Test message');
      expect(mockLogger.log).toHaveBeenCalledWith('debug', 'Test message');
    });

    it('should call logger with correct level for info', async () => {
      await info('Test message');
      expect(mockLogger.log).toHaveBeenCalledWith('info', 'Test message');
    });

    it('should call logger with correct level for warn', async () => {
      await warn('Test message');
      expect(mockLogger.log).toHaveBeenCalledWith('warn', 'Test message');
    });

    it('should call logger with correct level for error', async () => {
      await error('Test message');
      expect(mockLogger.log).toHaveBeenCalledWith('error', 'Test message');
    });

    it('should pass multiple arguments correctly', async () => {
      const obj = { test: 'value' };
      await info('Test message', obj);
      expect(mockLogger.log).toHaveBeenCalledWith('info', 'Test message', obj);
    });
  });

  describe('log function', () => {
    it('should pass arguments directly to logger', async () => {
      await log('Test message');
      expect(mockLogger.log).toHaveBeenCalledWith('Test message');
    });

    it('should handle log level as first argument', async () => {
      await log('debug', 'Test message');
      expect(mockLogger.log).toHaveBeenCalledWith('debug', 'Test message');
    });
  });

  describe('initLogger', () => {
    it('should initialize logger with custom config', () => {
      const config = {
        maxLogFiles: 10,
        maxLogSizeMB: 5,
      };
      initLogger(config);
      expect(Logger.getInstance).toHaveBeenCalledWith(config);
    });

    it('should return logger instance', () => {
      const logger = initLogger({});
      expect(logger).toBe(mockLogger);
    });
  });

  describe('getLoggerInterface', () => {
    it('should return logger interface', () => {
      const loggerInterface = getLoggerInterface();
      expect(loggerInterface).toBeDefined();
      expect(typeof loggerInterface.getLogFiles).toBe('function');
      expect(typeof loggerInterface.getCurrentSessionLog).toBe('function');
      expect(typeof loggerInterface.readLogFile).toBe('function');
      expect(typeof loggerInterface.deleteLogFile).toBe('function');
      expect(typeof loggerInterface.deleteAllLogs).toBe('function');
      expect(typeof loggerInterface.cleanupCurrentSession).toBe('function');
    });

    it('should return the same interface instance', () => {
      const interface1 = getLoggerInterface();
      const interface2 = getLoggerInterface();
      expect(interface1).toBe(interface2);
    });
  });

  it('should export Logger class', () => {
    expect(typeof Logger).toBe('object');
    const logger: Logger = Logger.getInstance();
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should export utils', () => {
    import('../utils').then(utils => {
      expect(utils).toBeDefined();
      expect(typeof utils.formatMessage).toBe('function');
    });
  });
});
