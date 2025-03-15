"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.FALLBACK_DIRS = exports.LOG_DIR = exports.LOG_RETENTION_DAYS = exports.MAX_LOG_SIZE_MB = exports.MAX_LOG_FILES = exports.DEFAULT_SYMBOLS = exports.COLORS = void 0;
const react_native_1 = require("react-native");
const react_native_blob_util_1 = __importDefault(require("react-native-blob-util"));
exports.COLORS = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m', // Green
    warn: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
    timestamp: '\x1b[90m', // Gray
    reset: '\x1b[0m', // Reset
    dim: '\x1b[2m', // Dimmed text
    bright: '\x1b[1m', // Bright/Bold text
    bgBlack: '\x1b[40m', // Black background
    jsonKey: '\x1b[34m', // Blue
    jsonString: '\x1b[32m', // Green
    jsonNumber: '\x1b[33m', // Yellow
    jsonBoolean: '\x1b[35m', // Magenta
    jsonNull: '\x1b[90m', // Gray
};
exports.DEFAULT_SYMBOLS = {
    debug: '🔍',
    info: '📱',
    warn: '⚠️',
    error: '❌',
};
exports.MAX_LOG_FILES = 50;
exports.MAX_LOG_SIZE_MB = 10;
exports.LOG_RETENTION_DAYS = 30;
exports.LOG_DIR = react_native_1.Platform.select({
    ios: `${react_native_blob_util_1.default.fs.dirs.DocumentDir}/logs`,
    android: `${react_native_blob_util_1.default.fs.dirs.CacheDir}/logs`,
});
exports.FALLBACK_DIRS = react_native_1.Platform.select({
    android: [
        react_native_blob_util_1.default.fs.dirs.CacheDir,
        react_native_blob_util_1.default.fs.dirs.DocumentDir,
        react_native_blob_util_1.default.fs.dirs.MainBundleDir,
    ],
    ios: [
        react_native_blob_util_1.default.fs.dirs.DocumentDir,
        react_native_blob_util_1.default.fs.dirs.CacheDir,
    ],
});
exports.DEFAULT_CONFIG = {
    maxLogFiles: exports.MAX_LOG_FILES,
    maxLogSizeMB: exports.MAX_LOG_SIZE_MB,
    logRetentionDays: exports.LOG_RETENTION_DAYS,
    filters: [],
    customColors: exports.COLORS,
    customSymbols: exports.DEFAULT_SYMBOLS,
};
