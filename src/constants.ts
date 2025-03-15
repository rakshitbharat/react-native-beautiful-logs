import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

export const COLORS = {
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

export const DEFAULT_SYMBOLS = {
  debug: '🔍',
  info: '📱',
  warn: '⚠️',
  error: '❌',
};

export const MAX_LOG_FILES = 50;
export const MAX_LOG_SIZE_MB = 10;
export const LOG_RETENTION_DAYS = 30;

export const LOG_DIR = Platform.select({
  ios: `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/logs`,
  android: `${ReactNativeBlobUtil.fs.dirs.CacheDir}/logs`,
});

export const FALLBACK_DIRS = Platform.select({
  android: [
    ReactNativeBlobUtil.fs.dirs.CacheDir,
    ReactNativeBlobUtil.fs.dirs.DocumentDir,
    ReactNativeBlobUtil.fs.dirs.MainBundleDir,
  ],
  ios: [
    ReactNativeBlobUtil.fs.dirs.DocumentDir,
    ReactNativeBlobUtil.fs.dirs.CacheDir,
  ],
});

export const DEFAULT_CONFIG = {
  maxLogFiles: MAX_LOG_FILES,
  maxLogSizeMB: MAX_LOG_SIZE_MB,
  logRetentionDays: LOG_RETENTION_DAYS,
  filters: [] as string[],
  customColors: COLORS,
  customSymbols: DEFAULT_SYMBOLS,
};