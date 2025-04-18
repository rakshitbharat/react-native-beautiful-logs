/**
 * @fileoverview Defines constants used throughout the logging library.
 * These constants control aspects like filtering, console appearance, and file management.
 * @category Configuration
 */

import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { LogLevel } from './types'; // Ensure LogLevel is imported if used here

/**
 * Array of string patterns used to filter out log messages.
 * Log messages where any part (when converted to a string) contains one of these
 * filter strings (case-insensitive) will be completely skipped (not logged to
 * console or file).
 *
 * @example Filtering network logs and temporary diagnostic codes
 * ```typescript
 * // in constants.ts
 * export const LOG_FILTERS: string[] = ['[Network]', '[TEMP_DTC]'];
 *
 * // in your code
 * import { log } from 'react-native-beautiful-logs';
 * log('debug', '[Network]', 'Sending request...'); // This log will be filtered out
 * log('info', '[UserProfile]', 'Profile loaded.'); // This log will be shown
 * log('warn', '[TEMP_DTC]', 'P0123 detected'); // This log will be filtered out
 * ```
 * @category Configuration
 */
export const LOG_FILTERS: string[] = [
  // `[Axios]`, // Example: Filter logs from Axios if too verbose
  // `[TEMP_DTC]`, // Example: Filter temporary diagnostic codes
];

/**
 * ANSI escape codes for styling log output in compatible terminals (like React Native Metro bundler console).
 * Includes colors for log levels, timestamps, and syntax highlighting for JSON objects.
 * @see {@link formatConsoleMessage} - Primary consumer for level and timestamp colors.
 * @see {@link formatJSON} - Consumer for JSON syntax highlighting colors.
 * @category Configuration
 */
export const COLORS: Record<
  | LogLevel
  | 'timestamp'
  | 'reset'
  | 'dim'
  | 'bright'
  | 'bgBlack'
  | 'jsonKey'
  | 'jsonString'
  | 'jsonNumber'
  | 'jsonBoolean'
  | 'jsonNull',
  string
> = {
  // Log Levels
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m', // Green
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  // General Formatting
  timestamp: '\x1b[90m', // Gray (dim white)
  reset: '\x1b[0m', // Resets all styles/colors
  dim: '\x1b[2m', // Dimmed text
  bright: '\x1b[1m', // Bright/Bold text
  bgBlack: '\x1b[40m', // Black background (rarely needed)
  // JSON Syntax Highlighting
  jsonKey: '\x1b[34m', // Blue
  jsonString: '\x1b[32m', // Green
  jsonNumber: '\x1b[33m', // Yellow
  jsonBoolean: '\x1b[35m', // Magenta
  jsonNull: '\x1b[90m', // Gray (dim white)
};

/**
 * Emojis used as visual indicators prefixing log level names in the console output.
 * Provides a quick visual cue for the severity or type of log message.
 * @see {@link formatConsoleMessage} where these symbols are used.
 * @category Configuration
 */
export const SYMBOLS: Record<LogLevel, string> = {
  debug: '🔍', // Magnifying glass for debug
  info: '📱', // Mobile phone for general info
  warn: '⚠️', // Warning sign
  error: '❌', // Cross mark for error
};

/**
 * Default base directory for storing log files, chosen based on the platform.
 * - **iOS:** `DocumentDir` (Persistent, user-accessible via Files app, backed up by iCloud if enabled). Ideal for long-term storage.
 * - **Android:** `CacheDir` (App-specific cache, may be cleared by the OS under storage pressure or by the user clearing the cache). Less persistent but generally always available.
 *
 * Consider implications of storage choice (persistence, user access, potential clearing).
 * @see {@link https://github.com/joltup/react-native-blob-util?tab=readme-ov-file#managed-folders | ReactNativeBlobUtil Managed Folders documentation} for details on directories.
 * @see {@link FALLBACK_DIRS} for directories tried if this default fails.
 * @category File Management
 * @category Configuration
 */
export const DEFAULT_LOG_DIR_BASE = Platform.select({
  ios: ReactNativeBlobUtil.fs.dirs.DocumentDir,
  android: ReactNativeBlobUtil.fs.dirs.CacheDir,
  default: ReactNativeBlobUtil.fs.dirs.CacheDir, // Fallback for other platforms or if select fails
});

/**
 * Maximum number of log files to retain in the log directory during cleanup.
 * When `cleanupOldLogs` runs, if more than this number of log files exist,
 * the oldest files (based on filename date) will be deleted until the count
 * reaches this limit. Set to `0` or negative to disable count-based cleanup.
 * @see {@link cleanupOldLogs} - Function performing the cleanup.
 * @category File Management
 * @category Configuration
 */
export const MAX_LOG_FILES = 50;

/**
 * Maximum size (in Megabytes) allowed for a single log file.
 * After a log message is successfully written by `writeToFile`, it checks the size
 * of the current log file. If the size exceeds this limit, the session is marked
 * for rollover. The *next* log message written will trigger the creation of a
 * new session log file (using the date logic from `generateLogFilename`).
 * The oversized file remains until the next `cleanupOldLogs` cycle, where it might
 * be deleted based on age or count limits.
 * Set to `0` or negative to disable size-based rollover/cleanup.
 * @see {@link writeToFile} - Checks size after writing.
 * @see {@link cleanupOldLogs} - Deletes oversized files during cleanup.
 * @category File Management
 * @category Configuration
 */
export const MAX_LOG_SIZE_MB = 10; // Maximum size per log file in MB

/**
 * Maximum age (in days) for log files before they are automatically deleted
 * during the cleanup process. `cleanupOldLogs` compares the date embedded in
 * the log filename (e.g., `YYYY-MM-DD`) against the current date. Files older
 * than this threshold (excluding the currently active session file) will be deleted.
 * Set to `0` or negative to disable age-based cleanup.
 * @see {@link cleanupOldLogs} - Function performing the cleanup.
 * @category File Management
 * @category Configuration
 */
export const MAX_LOG_AGE_DAYS = 30;

/**
 * List of fallback base directories to attempt if initializing the log directory
 * within {@link DEFAULT_LOG_DIR_BASE} fails (e.g., due to permissions, disk full, or unexpected errors).
 * The library will attempt these directories sequentially after the default directory fails.
 * Note: `MainBundleDir` on Android is typically read-only and generally unsuitable for logs.
 *       `DocumentDir` on Android might require explicit user permissions or specific manifest configurations.
 * @see {@link initSessionLog} - Uses this list during initialization.
 * @see {@link DEFAULT_LOG_DIR_BASE} - The primary directory attempted first.
 * @category File Management
 * @category Configuration
 */
export const FALLBACK_DIRS: string[] = (
  Platform.select({
    android: [
      ReactNativeBlobUtil.fs.dirs.CacheDir, // Often the most reliable writable location
      ReactNativeBlobUtil.fs.dirs.DocumentDir, // May require permissions or specific setup
      // ReactNativeBlobUtil.fs.dirs.MainBundleDir, // Usually read-only, avoid for writing
    ],
    ios: [
      ReactNativeBlobUtil.fs.dirs.DocumentDir, // Usually preferred on iOS
      ReactNativeBlobUtil.fs.dirs.CacheDir, // Less persistent than DocumentDir, but often writable
    ],
    default: [ReactNativeBlobUtil.fs.dirs.CacheDir], // Default fallback for other platforms
  }) ?? []
) // Use empty array if Platform.select returns null/undefined
  .filter((dir): dir is string => !!dir); // Filter out potential null/undefined values from dirs array

/**
 * The name of the subdirectory created within the chosen base directory
 * (either {@link DEFAULT_LOG_DIR_BASE} or one of the {@link FALLBACK_DIRS})
 * where the actual log files (`session_YYYY-MM-DD.txt`) will be stored.
 * The final log path structure will be: `<baseDir>/<LOGS_SUBDIR>/<logFileName>`.
 * @example `/mock/cache/logs/session_2024-01-15.txt`
 * @category File Management
 * @category Configuration
 */
export const LOGS_SUBDIR = 'logs';

/**
 * The file extension used for all log files generated by this library.
 * Includes the leading dot.
 * @example `.txt`
 * @category File Management
 * @category Configuration
 */
export const LOG_FILE_SUFFIX = '.txt';

/**
 * The prefix used for log file names. The calculated session date (YYYY-MM-DD)
 * follows this prefix, and the {@link LOG_FILE_SUFFIX} follows the date.
 * @example `session_` results in filenames like `session_2024-01-15.txt`.
 * @see {@link generateLogFilename} - Uses this prefix.
 * @category File Management
 * @category Configuration
 */
export const LOG_FILE_PREFIX = 'session_';

/**
 * The primary text encoding used when writing to log files. UTF-8 is standard
 * and supports a wide range of characters.
 * @see {@link appendToFile} - Uses this encoding first.
 * @category File Management
 * @category Configuration
 */
export const LOG_FILE_ENCODING = 'utf8';

/**
 * Fallback text encoding used for writing log files, specifically on Android,
 * if writing with the primary {@link LOG_FILE_ENCODING} (`utf8`) fails.
 * On failure, the content is encoded to Base64 before being written using this encoding.
 * Reading these files requires detecting or assuming Base64 encoding and decoding accordingly.
 * This is a workaround for potential filesystem or library issues on certain Android versions/devices.
 * @see {@link appendToFile} - Uses this as a fallback on Android write errors.
 * @see {@link loggerInterface.readLogFile} - Handles decoding Base64 content automatically during read.
 * @category File Management
 * @category Configuration
 */
export const LOG_FILE_ENCODING_FALLBACK = 'base64';
