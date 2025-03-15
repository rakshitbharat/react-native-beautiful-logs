import { Logger as LoggerClass } from './Logger.js';
import * as utils from './utils.js';
// Create convenience methods for each log level
export const debug = (...args) => LoggerClass.getInstance().log('debug', ...args);
export const info = (...args) => LoggerClass.getInstance().log('info', ...args);
export const warn = (...args) => LoggerClass.getInstance().log('warn', ...args);
export const error = (...args) => LoggerClass.getInstance().log('error', ...args);
// Main log function
export const log = (level, ...args) => {
    return LoggerClass.getInstance().log(level, ...args);
};
// Initialize logger with custom config
export const initLogger = (config) => {
    return LoggerClass.getInstance(config);
};
// Get logger interface for file operations
export const getLoggerInterface = () => {
    return LoggerClass.getInstance().loggerInterface;
};
export { LoggerClass as Logger };
export { utils };
//# sourceMappingURL=index.js.map