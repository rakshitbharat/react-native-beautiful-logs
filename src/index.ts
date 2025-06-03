/**
 * React Native Beautiful Logs
 *
 * @fileoverview This is the main entry point for the `react-native-beautiful-logs` library.
 * It exports the primary logging function (`log`), the interface for managing log files (`loggerInterface`),
 * the session initialization function (`initSessionLog`), and relevant TypeScript types
 * needed for using the library effectively.
 *
 * @packageDocumentation
 * @module react-native-beautiful-logs
 */

import { log as internalLog } from './Logger'; // Rename import to avoid conflict
import {
  loggerInterface as internalLoggerInterface,
  initSessionLog as internalInitSessionLog,
} from './fileManager';
import {
  LogLevel as InternalLogLevel,
  LoggerInterface as InternalLoggerInterface,
  LoggerConfig as InternalLoggerConfig,
} from './types';
// Import the setter function
import { setLogFilters } from './constants';

/**
 * Initializes the file logging session. This ensures the log directory exists,
 * sets up the log file for the current session based on the date, and performs
 * initial log cleanup.
 *
 * It's recommended to call this early in your app's lifecycle (e.g., in `index.js` or `App.tsx`)
 * for predictable file logging behavior, although the library will attempt to initialize
 * automatically on the first `log` call if this hasn't been called yet.
 *
 * @example Explicit Initialization in App.tsx
 * ```typescript
 * import React, { useEffect } from 'react';
 * import { View, Text } from 'react-native';
 * import { initSessionLog, log } from 'react-native-beautiful-logs';
 *
 * function App() {
 *   useEffect(() => {
 *     const initializeLogging = async () => {
 *       const success = await initSessionLog();
 *       if (success) {
 *         log('[App]', 'File logging initialized successfully.');
 *       } else {
 *         log('[App]', 'File logging initialization failed.');
 *       }
 *     };
 *     initializeLogging();
 *   }, []);
 *
 *   return (
 *     <View>
 *       <Text>App Content</Text>
 *     </View>
 *   );
 * }
 * export default App;
 * ```
 *
 * @returns {Promise<boolean>} A promise resolving to `true` if initialization succeeded, `false` otherwise.
 * @see {@link internalInitSessionLog} (in fileManager.ts) for detailed implementation.
 * @category Core
 * @public
 */
export const initSessionLog = internalInitSessionLog;

/**
 * The main logging function. Use this to log messages to both the developer console
 * (with colors, timestamps, and level indicators) and the persistent log file (as plain text).
 * Supports different levels, multiple arguments, object/Error formatting, module tagging, and filtering.
 *
 * @param levelOrMessage - The log level (`'debug'`, `'info'`, `'warn'`, `'error'`) OR the first part of the message if the level is omitted (defaults to `'info'`).
 * @param args - Additional data to log (strings, numbers, objects, Errors, etc.).
 * @see {@link internalLog} (in Logger.ts) for detailed parameter breakdown and more examples.
 * @category Core
 * @public
 */
export const log = internalLog;

/**
 * An interface object providing methods to interact directly with the log files
 * managed by the library. Allows listing files, reading content, deleting individual files,
 * deleting all old files, and managing the current session state.
 *
 * @see {@link InternalLoggerInterface} (in types.ts) for detailed definitions of all methods.
 * @see {@link internalLoggerInterface} (in fileManager.ts) for implementation details and usage example.
 * @category File Management
 * @public
 */
export const loggerInterface = internalLoggerInterface;

// --- Exported Types ---

/**
 * Represents the available levels for logging messages.
 * @category Types
 * @public
 */
export type LogLevel = InternalLogLevel;

/**
 * Describes the interface for interacting with log files (listing, reading, deleting).
 * Use this type when interacting with the `loggerInterface` object.
 *
 * @example Type Hinting with LoggerInterface
 * ```typescript
 * import { loggerInterface, LoggerInterface, LogLevel } from 'react-native-beautiful-logs';
 *
 * async function processLogFiles(fileManager: LoggerInterface, levelToShow: LogLevel) {
 *   const files = await fileManager.getLogFiles();
 *   console.log(`Found ${files.length} log files.`);
 *   // ... process files
 * }
 *
 * // Pass the exported loggerInterface instance
 * processLogFiles(loggerInterface, 'info');
 * ```
 * @category Types
 * @public
 */
export type LoggerInterface = InternalLoggerInterface;

/**
 * Defines the structure for potential future configuration options. (Currently unused).
 * @category Types
 * @public
 */
export type LoggerConfig = InternalLoggerConfig;

// --- Automatic Initialization ---
/**
 * @internal
 * Attempts to automatically initialize the file logging session when the module is first loaded/imported.
 * This provides a convenient setup for basic use cases, ensuring file logging works without
 * requiring an explicit `initSessionLog()` call from the user.
 *
 * Note: This initialization happens asynchronously in the background. In scenarios with very rapid
 * log calls immediately after app start, the first few log messages might occur *before* this
 * auto-initialization completes. However, the `log` function itself contains a check and will
 * trigger `initSessionLog` if needed, ensuring logs are eventually written.
 *
 * Errors during this automatic background initialization are logged to the console but
 * should not crash the application.
 */
const performAutoInitialization = async () => {
  try {
    // console.debug('[Logger Index] Triggering automatic background initialization...');
    await internalInitSessionLog();
    // console.debug('[Logger Index] Automatic background initialization attempt finished.');
  } catch (error) {
    // Catch any unexpected errors from the init process itself
    console.error(
      'react-native-beautiful-logs: Automatic background session initialization failed.',
      error,
    );
  }
};

// Trigger the async auto-initialization. It runs without blocking the module import.
performAutoInitialization();

// --- Configuration ---

/**
 * @internal
 * Holds the current logger configuration state. Currently only supports logFilters.
 */
let currentConfig: InternalLoggerConfig = {};

/**
 * Configures global logger settings. Currently, only supports updating log filters.
 *
 * @param {Partial<InternalLoggerConfig>} config - An object containing configuration options to override. Only `logFilters` is currently supported.
 * @category Configuration
 * @public
 * @example Setting Log Filters
 * ```typescript
 * import { configureLogger, log } from 'react-native-beautiful-logs';
 *
 * // Initially, all logs might be shown
 * log('info', '[Network]', 'Fetching data...');
 *
 * // Configure filters to hide network logs
 * configureLogger({ logFilters: ['[Network]'] });
 *
 * // This log will now be filtered out
 * log('info', '[Network]', 'Data fetched.');
 * log('info', '[Auth]', 'User logged in.'); // This will still be shown
 *
 * // Clear filters
 * configureLogger({ logFilters: [] });
 * log('info', '[Network]', 'Another network call.'); // This will be shown again
 * ```
 */
export const configureLogger = (config: Partial<InternalLoggerConfig>) => {
  currentConfig = { ...currentConfig, ...config };

  // Apply specific configurations
  if (config.logFilters !== undefined) {
    // Validate that logFilters is an array of strings
    if (
      Array.isArray(config.logFilters) &&
      config.logFilters.every(item => typeof item === 'string')
    ) {
      setLogFilters(config.logFilters);
    } else {
      console.warn(
        'react-native-beautiful-logs: Invalid logFilters provided to configureLogger. Expected string[]. Filters not updated.',
        config.logFilters,
      );
    }
  }

  // Add handling for other config options here in the future
  // e.g., if (config.maxLogFiles !== undefined) { ... }
};
