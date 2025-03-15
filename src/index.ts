import { Logger } from './Logger';
import type { LogLevel, LoggerConfig, LoggerInterface } from './types';

// Create convenience methods for each log level
export const debug = (...args: any[]): Promise<void> => 
  Logger.getInstance().log('debug', ...args);

export const info = (...args: any[]): Promise<void> => 
  Logger.getInstance().log('info', ...args);

export const warn = (...args: any[]): Promise<void> => 
  Logger.getInstance().log('warn', ...args);

export const error = (...args: any[]): Promise<void> => 
  Logger.getInstance().log('error', ...args);

// Main log function
export const log = (level: string | any, ...args: any[]): Promise<void> => {
  return Logger.getInstance().log(level, ...args);
};

// Initialize logger with custom config
export const initLogger = (config: LoggerConfig): Logger => {
  return Logger.getInstance(config);
};

// Get logger interface for file operations
export const getLoggerInterface = (): LoggerInterface => {
  return Logger.getInstance().loggerInterface;
};

export type { LogLevel, LoggerConfig, LoggerInterface };

// Create default instance
export default Logger.getInstance();