"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = exports.Logger = exports.getLoggerInterface = exports.initLogger = exports.log = exports.error = exports.warn = exports.info = exports.debug = void 0;
const Logger_1 = require("./Logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return Logger_1.Logger; } });
const utils = __importStar(require("./utils"));
exports.utils = utils;
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
//# sourceMappingURL=index.js.map