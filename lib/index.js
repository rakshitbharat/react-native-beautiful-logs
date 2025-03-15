"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoggerInterface = exports.initLogger = exports.log = exports.error = exports.warn = exports.info = exports.debug = void 0;
const Logger_1 = require("./Logger");
// Create convenience methods for each log level
const debug = (...args) => Logger_1.Logger.getInstance().log('debug', ...args);
exports.debug = debug;
const info = (...args) => Logger_1.Logger.getInstance().log('info', ...args);
exports.info = info;
const warn = (...args) => Logger_1.Logger.getInstance().log('warn', ...args);
exports.warn = warn;
const error = (...args) => Logger_1.Logger.getInstance().log('error', ...args);
exports.error = error;
// Main log function
const log = (level, ...args) => {
    return Logger_1.Logger.getInstance().log(level, ...args);
};
exports.log = log;
// Initialize logger with custom config
const initLogger = (config) => {
    return Logger_1.Logger.getInstance(config);
};
exports.initLogger = initLogger;
// Get logger interface for file operations
const getLoggerInterface = () => {
    return Logger_1.Logger.getInstance().loggerInterface;
};
exports.getLoggerInterface = getLoggerInterface;
// Create default instance
exports.default = Logger_1.Logger.getInstance();
