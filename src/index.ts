import { Logger as LoggerClass } from './Logger';
import type { LogLevel, LoggerConfig, LoggerInterface } from './types';
import * as utils from './utils';

// Create convenience methods for each log level
export const debug = (...args: unknown[]): Promise<void> =>
  LoggerClass.getInstance().log('debug', ...args);

export const info = (...args: unknown[]): Promise<void> =>
  LoggerClass.getInstance().log('info', ...args);

export const warn = (...args: unknown[]): Promise<void> =>
  LoggerClass.getInstance().log('warn', ...args);

export const error = (...args: unknown[]): Promise<void> =>
  LoggerClass.getInstance().log('error', ...args);

// Main log function
export const log = (level: LogLevel | string, ...args: unknown[]): Promise<void> => {
  return LoggerClass.getInstance().log(level, ...args);
};

// Initialize logger with custom config
export const initLogger = (config: LoggerConfig): LoggerClass => {
  return LoggerClass.getInstance(config);
};

// Get logger interface for file operations
export const getLoggerInterface = (): LoggerInterface => {
  return LoggerClass.getInstance().loggerInterface;
};

export { LoggerClass as Logger };
export { utils };
export type { LogLevel, LoggerConfig, LoggerInterface };
