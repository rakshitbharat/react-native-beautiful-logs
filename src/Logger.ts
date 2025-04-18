/**
 * @fileoverview Contains the core `log` function responsible for processing
 * log messages, formatting them for console and file output, and handling filtering.
 * @category Core
 */

import { LOG_FILTERS, SYMBOLS } from './constants';
import { LogLevel } from './types';
import { formatConsoleMessage, stripAnsiCodes } from './utils';
import { writeToFile, initSessionLog } from './fileManager';

/**
 * @internal
 * Flag to ensure automatic initialization (triggered by the first log call)
 * is attempted only once per application lifecycle by the logger itself.
 * Subsequent calls to `initSessionLog` or `writeToFile` can still trigger
 * initialization checks within the `fileManager`.
 */
let initAttemptedByLogger = false;

/**
 * Ensures the file logging session is initialized if it hasn't been attempted yet
 * by this automatic mechanism. Called implicitly by the `log` function on the
 * first log attempt if needed. Prevents multiple rapid initialization calls
 * triggered *by the logger itself*. Further checks happen within `fileManager`.
 * @internal
 * @async
 * @returns {Promise<void>} Resolves when the initialization attempt is complete or deemed unnecessary.
 */
const ensureInitialized = async (): Promise<void> => {
  if (!initAttemptedByLogger) {
    initAttemptedByLogger = true; // Set flag immediately to prevent concurrent calls from *this* mechanism
    try {
      // console.debug('[Logger] ensureInitialized: Triggering initSessionLog...');
      await initSessionLog();
      // The actual initialization state (`isSessionInitialized`) is managed within fileManager.
    } catch (error) {
      // Errors during init are logged by initSessionLog itself.
      // Log an additional error here only if the automatic trigger specifically fails.
      console.error('[Logger] Automatic initialization triggered by log function failed:', error);
    }
  }
  // If already attempted by logger, subsequent log calls rely on fileManager's internal checks.
};

/**
 * Logs messages to the development console (with colors and formatting)
 * and appends a plain text version to a persistent log file.
 *
 * Supports different log levels (`debug`, `info`, `warn`, `error`).
 * Handles various data types (strings, numbers, objects, Errors).
 * Allows filtering logs based on substrings defined in `LOG_FILTERS`.
 * Initializes the file logging session automatically on the first call if needed.
 *
 * @param levelOrMessage - The log level (`'debug'`, `'info'`, `'warn'`, `'error'`) OR the first part of the message if the level is omitted (defaults to `'info'`).
 * @param args - Additional parts of the log message. Can be strings, numbers, objects, Errors, etc. Objects and Errors will be formatted appropriately for console and file output. Arguments are processed in order.
 *
 * @example Basic Usage
 * ```typescript
 * import { log } from 'react-native-beautiful-logs';
 *
 * log('info', 'User logged in:', { userId: 123 });
 * log('warn', 'Configuration value missing, using default.');
 * log('error', 'Failed to load data', new Error('Network Error'));
 * log('debug', 'API Response:', { status: 200, data: { /* ... *\/ } });
 * ```
 *
 * @example Omitting Log Level (Defaults to 'info')
 * ```typescript
 * log('Application started.'); // Logs as 'info'
 * log('User details:', { name: 'Jane Doe' }); // Logs as 'info'
 * ```
 *
 * @example Using Module Names (Recommended)
 * ```typescript
 * // Include a module identifier like "[ModuleName]" as the first string argument
 * // after the level (or as the first argument if level is omitted).
 * log('info', '[AuthService]', 'Login attempt failed:', { reason: 'Invalid credentials' });
 * log('[Network]', 'Request sent to /api/users'); // Defaults to 'info' level
 * log('debug', '[DataProcessing]', 'Processing item:', item);
 * ```
 *
 * @example Filtering
 * ```typescript
 * // Assuming LOG_FILTERS = ['[Network]', 'Sensitive'] in constants.ts
 * log('[Network]', 'Sensitive network data...'); // This log will be skipped
 * log('info', '[UserProfile]', 'User updated profile.'); // This log will be shown
 * log('warn', 'Token contains Sensitive info'); // This log will be skipped
 * ```
 *
 * @category Core
 * @returns {void}
 */
export const log = (...args: unknown[]): void => {
  // 1. Ensure file logging session initialization is attempted (async, non-blocking here)
  // We don't await this promise here; `writeToFile` will handle waiting if necessary.
  ensureInitialized();

  // 2. Determine Log Level and Message Parts
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  let level: LogLevel = 'info'; // Default level
  let messageParts: unknown[] = args; // Use unknown for better type safety than any

  // Check if the first argument is a valid log level string
  if (args.length > 0 && typeof args[0] === 'string' && validLevels.includes(args[0] as LogLevel)) {
    level = args[0] as LogLevel;
    messageParts = args.slice(1); // The rest are message parts
  }

  // Handle edge case: log() called with no arguments or only a level
  if (messageParts.length === 0) {
    // console.debug("[Logger] Empty log() call detected (or only level provided).");
    messageParts.push('[Empty log call]'); // Add placeholder for formatting consistency
  }

  // 3. Apply Filters (Case-insensitive check against LOG_FILTERS)
  // Create lower-case versions once for efficiency
  const lowerCaseFilters = LOG_FILTERS.map(f => f.toLowerCase());
  const shouldFilter = messageParts.some(part => {
    if (typeof part === 'string') {
      const lowerPart = part.toLowerCase();
      // Check if any filter is a substring of the lowercased message part
      return lowerCaseFilters.some(filter => lowerPart.includes(filter));
    }
    return false; // Don't filter based on non-string parts
  });

  if (shouldFilter) {
    // Optional: console.debug('[Logger] Log message filtered out:', messageParts);
    return; // Skip logging this message entirely
  }

  // 4. Format and Log (Console and File)
  try {
    // 4a. Format for Console (with colors, symbols, etc.)
    // `formatConsoleMessage` needs to handle `unknown[]` gracefully.
    const formattedConsoleMessage = formatConsoleMessage(level, messageParts, SYMBOLS);

    // 4b. Log to Console using appropriate method for level
    switch (level) {
      case 'debug':
        console.debug(formattedConsoleMessage);
        break;
      case 'error':
        console.error(formattedConsoleMessage);
        break;
      case 'warn':
        console.warn(formattedConsoleMessage);
        break;
      case 'info':
      default:
        // Fallback to console.log for 'info' and any unexpected levels
        console.log(formattedConsoleMessage);
        break;
    }

    // 4c. Format for File (strip colors, prepare content)
    // Strip ANSI codes from the console message to get plain text
    const plainTextMessage = stripAnsiCodes(formattedConsoleMessage);

    // Extract the core message content after the header (Timestamp [LEVEL] [Module] -> )
    // This avoids duplicating the timestamp/level/module in the file entry body.
    const messageStartIndex = plainTextMessage.indexOf('→');
    const fileMessageContent =
      messageStartIndex !== -1
        ? plainTextMessage.substring(messageStartIndex + 1).trim() // Get content after arrow and trim whitespace
        : plainTextMessage; // Fallback to the full plain message if arrow isn't found (shouldn't happen)

    // 4d. Write to File (Asynchronously - fire and forget)
    // `writeToFile` handles its own initialization checks, error handling, and awaiting if necessary.
    writeToFile(fileMessageContent, level).catch(err => {
      // This catch is a final safeguard for unhandled promise rejections *from the writeToFile call itself*,
      // although `writeToFile` should ideally handle its internal errors gracefully.
      console.error('[Logger] Critical error: Uncaught exception during writeToFile call:', err);
    });
  } catch (error: unknown) {
    // Fallback for unexpected errors during the logging *process* itself (formatting, console calls, etc.)
    // We use console.error directly here as the logger itself failed.
    console.error(
      '❌❌❌ react-native-beautiful-logs: Internal Logging System Error:',
      error instanceof Error ? error.message : String(error), // Provide clearer error message
      { originalArgs: args }, // Include original arguments for debugging the logger
      error, // Log the full error object/value if available
    );
  }
};
