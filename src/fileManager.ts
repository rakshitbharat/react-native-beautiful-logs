/**
 * @fileoverview Manages file system operations for logging. This includes
 * initializing the log directory and file for a session, writing log entries,
 * cleaning up old log files based on configured rules, and providing an
 * interface (`loggerInterface`) to access and manage these files.
 * @category File Management
 */

import { Platform } from 'react-native';
import ReactNativeBlobUtil, { ReactNativeBlobUtilStat } from 'react-native-blob-util';
import moment from 'moment';
import { Buffer } from 'buffer'; // Import Buffer explicitly for base64 fallback logic

import {
  DEFAULT_LOG_DIR_BASE,
  FALLBACK_DIRS,
  LOGS_SUBDIR,
  LOG_FILE_PREFIX,
  LOG_FILE_SUFFIX,
  MAX_LOG_FILES,
  MAX_LOG_SIZE_MB,
  MAX_LOG_AGE_DAYS,
  LOG_FILE_ENCODING,
  LOG_FILE_ENCODING_FALLBACK,
} from './constants';
import { LoggerInterface, LogLevel } from './types';
import { generateLogFilename } from './utils'; // Correct import

// --- Module State ---
/** @internal Tracks if the logging session is currently initialized (directory and file path confirmed). */
let isSessionInitialized = false;
/** @internal The full, absolute path to the directory where log files are stored (e.g., `/path/to/cache/logs`). Null if not initialized. */
let logDirectoryPath: string | null = null;
/** @internal The full, absolute path to the current log file being written to (e.g., `/path/to/cache/logs/session_YYYY-MM-DD.txt`). Null if not initialized. */
let currentSessionLogPath: string | null = null;
/** @internal A simple lock flag to prevent concurrent execution of `initSessionLog`. */
let initializationInProgress = false;
/** @internal Stores the preferred base directory path. Defaults to DEFAULT_LOG_DIR_BASE but could be overridden by future configuration mechanisms. */
const preferredLogDirBase: string = DEFAULT_LOG_DIR_BASE;

// --- Helper Functions ---

/**
 * Attempts to create the log subdirectory (`<baseDir>/<LOGS_SUBDIR>`) if it doesn't exist
 * and verifies that write access is possible within that directory.
 * @internal
 * @param baseDir The base directory (e.g., `ReactNativeBlobUtil.fs.dirs.DocumentDir`) to attempt creating the logs subdirectory within.
 * @returns A promise resolving to the full path to the logs subdirectory (e.g., `/path/to/docs/logs`) if successful, otherwise `null`.
 * @async
 */
const tryCreateDirectory = async (baseDir: string): Promise<string | null> => {
  if (!baseDir) {
    // This shouldn't happen if called correctly, but guard anyway.
    console.warn('[Logger] tryCreateDirectory called with invalid base directory.');
    return null;
  }
  const logsPath = `${baseDir}/${LOGS_SUBDIR}`;
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(logsPath);
    if (!exists) {
      await ReactNativeBlobUtil.fs.mkdir(logsPath);
      // console.log(`[Logger] Created log directory: ${logsPath}`); // Less verbose logging
    }

    // Verify write access by writing and deleting a temporary file. This confirms permissions.
    const testFileName = `.write_test_${Date.now()}`;
    const testPath = `${logsPath}/${testFileName}`;
    await ReactNativeBlobUtil.fs.writeFile(testPath, 'write_test', LOG_FILE_ENCODING);
    await ReactNativeBlobUtil.fs.unlink(testPath);

    // console.debug(`[Logger] Write access verified for directory: ${logsPath}`);
    return logsPath; // Return the path to the logs subdirectory
  } catch (error: unknown) {
    console.warn(
      `[Logger] Failed to create or verify write access for directory ${logsPath}:`,
      error instanceof Error ? error.message : String(error),
    );
    return null; // Indicate failure
  }
};

/**
 * Initializes the file logging session. This function ensures:
 * 1. A writable log directory (`<baseDir>/logs/`) exists, attempting default and fallback locations.
 * 2. The log file for the current 2-day window (see {@link generateLogFilename}) exists or is created.
 * 3. A session start marker is written to the log file.
 * 4. Log cleanup (`cleanupOldLogs`) is triggered upon successful initialization.
 *
 * This is called automatically by the first `log()` call or can be invoked manually
 * early in the app lifecycle (recommended for predictability). Handles concurrent calls gracefully.
 *
 * @example Manually initializing early in your app (e.g., index.js or App.tsx)
 * ```typescript
 * import { initSessionLog } from 'react-native-beautiful-logs';
 *
 * async function initializeApp() {
 *   // ... other setup
 *   console.log('Initializing logging session...');
 *   const logSessionReady = await initSessionLog();
 *   if (logSessionReady) {
 *      console.log('File logging initialized successfully.');
 *   } else {
 *     console.warn("File logging could not be initialized. Logs will only go to console.");
 *   }
 *   // ... rest of app startup
 * }
 *
 * initializeApp();
 * ```
 *
 * @returns {Promise<boolean>} A promise resolving to `true` if initialization was successful
 *          (log directory and file are ready for writing), and `false` otherwise.
 *          Detailed errors during the process are logged internally via `console.warn` or `console.error`.
 * @category Core
 * @async
 */
export const initSessionLog = async (): Promise<boolean> => {
  // 1. Fast Check: Is the session already marked as initialized and seems valid?
  if (isSessionInitialized && currentSessionLogPath && logDirectoryPath) {
    try {
      // Quick check: Does the cached filename match the expected filename for *now*?
      const currentFileName = currentSessionLogPath.split('/').pop();
      const expectedFileName = generateLogFilename(); // Calculates filename based on current date

      if (currentFileName === expectedFileName) {
        // Filename matches the current date window. Now verify the file *actually* still exists.
        const fileExists = await ReactNativeBlobUtil.fs.exists(currentSessionLogPath);
        if (fileExists) {
          // console.debug('[Logger] Session already initialized and valid.');
          return true; // Session is active and ready.
        } else {
          console.warn(
            `[Logger] Current log file missing unexpectedly (${currentSessionLogPath}). Reinitializing session.`,
          );
          // Proceed to full re-initialization by resetting flags.
        }
      } else {
        // console.log( // Less verbose logging
        //   `[Logger] Log file date window changed (expected ${expectedFileName}, was ${currentFileName}). Reinitializing.`,
        // );
        // Date window changed, proceed to full re-initialization.
      }
    } catch (checkError: unknown) {
      console.warn(
        '[Logger] Error checking existing log file status. Reinitializing session.',
        checkError,
      );
      // Error during check, proceed to full re-initialization.
    }
    // Reset state if checks failed (file missing, date changed, error)
    isSessionInitialized = false;
    currentSessionLogPath = null;
    // Keep `logDirectoryPath` as the directory itself might still be valid.
  }

  // 2. Concurrency Lock: Prevent multiple simultaneous initialization attempts.
  if (initializationInProgress) {
    // console.debug('[Logger] Initialization already in progress, waiting briefly...');
    // Wait for a short period, then re-check if another process finished init.
    await new Promise(resolve => setTimeout(resolve, 250)); // Reduced wait time
    // Re-check the primary condition after waiting to see if another caller finished.
    return isSessionInitialized && !!currentSessionLogPath && !!logDirectoryPath;
  }

  initializationInProgress = true;
  // console.log('[Logger] Starting log session initialization...'); // Less verbose

  try {
    // 3. Determine Directories: Create list of directories to try (preferred first, then fallbacks).
    const dirsToTry = [
      preferredLogDirBase,
      ...FALLBACK_DIRS.filter(dir => dir !== preferredLogDirBase), // Add fallbacks not already preferred
    ].filter((dir): dir is string => !!dir); // Ensure all entries are valid, non-empty strings

    if (dirsToTry.length === 0) {
      console.error(
        '[Logger] CRITICAL: No valid log directories configured (DEFAULT_LOG_DIR_BASE and FALLBACK_DIRS are empty or invalid). File logging disabled.',
      );
      throw new Error('No valid log directories available.'); // Throw to ensure failure is propagated if needed.
    }

    let successfulInit = false;
    logDirectoryPath = null; // Reset before trying directories

    // 4. Attempt Initialization in each directory
    for (const baseDir of dirsToTry) {
      // console.debug(`[Logger] Attempting to use base directory: ${baseDir}`);
      const potentialLogDirPath = await tryCreateDirectory(baseDir);

      if (potentialLogDirPath) {
        // Found a working directory! Now set up the log file.
        logDirectoryPath = potentialLogDirPath;
        const fileName = generateLogFilename();
        const filePath = `${logDirectoryPath}/${fileName}`;
        let createdNewFile = false;

        try {
          // Check if the specific log file for the current period exists
          const fileExists = await ReactNativeBlobUtil.fs.exists(filePath);
          if (!fileExists) {
            // Create the file empty if it doesn't exist. Use internal helper for encoding resilience.
            // Use appendToFile helper to handle potential encoding issues from the start.
            await appendToFile(filePath, ''); // Create file using append (handles encoding)
            createdNewFile = true;
            // console.log(`[Logger] Created new log file: ${filePath}`); // Less verbose
          } else {
            // console.debug(`[Logger] Using existing log file: ${filePath}`);
          }

          // Final check to ensure file exists after attempt (paranoid check)
          const finalCheckExists = await ReactNativeBlobUtil.fs.exists(filePath);
          if (!finalCheckExists) {
            throw new Error(`Log file verification failed after creation/check: ${filePath}`);
          }

          // --- Success Point ---
          currentSessionLogPath = filePath;
          isSessionInitialized = true;
          successfulInit = true;

          // Write a session marker to the log file
          const timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
          // Use a different marker if we created a brand new file vs appending to existing
          const sessionMarker = createdNewFile
            ? `\n=== New Log Session Started at ${timestamp} ===\n` // First entry for this date window
            : `\n=== App Session Resumed at ${timestamp} ===\n`; // App restart within same date window
          await appendToFile(filePath, sessionMarker); // Use internal append helper

          console.log(`[Logger] Session initialized. Logging to: ${currentSessionLogPath}`);

          // Perform cleanup *after* successful initialization
          // Run cleanup asynchronously; don't block initialization return.
          cleanupOldLogs().catch(cleanupError => {
            console.warn('[Logger] Error during background log cleanup:', cleanupError);
          });

          break; // Exit the loop, initialization succeeded
        } catch (fileError: unknown) {
          console.warn(
            `[Logger] Failed to initialize log file ${filePath} in directory ${logDirectoryPath}. Error:`,
            fileError instanceof Error ? fileError.message : String(fileError),
            'Trying next directory if available.',
          );
          // Reset paths if file operation failed for *this* directory before trying the next
          logDirectoryPath = null;
          currentSessionLogPath = null;
          isSessionInitialized = false;
          successfulInit = false; // Ensure flag is false if this attempt fails
          // Continue to the next directory in the loop
        }
      }
    } // End of directory loop

    // 5. Final Outcome Check
    if (!successfulInit) {
      console.error(
        '[Logger] All storage locations failed. File logging disabled for this session. Tried:',
        dirsToTry.join(', '),
      );
      // Ensure state reflects failure
      isSessionInitialized = false;
      logDirectoryPath = null;
      currentSessionLogPath = null;
      return false; // Explicitly return false
    }

    return true; // Initialization was successful
  } catch (error: unknown) {
    console.error(
      '[Logger] Unexpected critical error during session initialization:',
      error instanceof Error ? error.message : String(error),
      error, // Log the full error object for details
    );
    // Ensure state reflects failure
    isSessionInitialized = false;
    logDirectoryPath = null;
    currentSessionLogPath = null;
    return false; // Explicitly return false on unexpected errors
  } finally {
    initializationInProgress = false; // Release the lock regardless of outcome
    // console.debug('[Logger] Initialization attempt finished.');
  }
};

/**
 * Appends string content to a specified file. Includes logic to handle potential
 * encoding issues on Android by attempting UTF-8 first and falling back to Base64
 * if the UTF-8 write fails. If append fails definitively, marks the session as
 * uninitialized to force re-initialization on the next write attempt.
 * @internal
 * @param filePath The full, absolute path to the file.
 * @param content The string content to append.
 * @returns {Promise<void>} Resolves when the append operation is complete or fails. Errors are logged.
 * @async
 */
const appendToFile = async (filePath: string, content: string): Promise<void> => {
  // Skip empty content writes (e.g., initial file creation check)
  if (content === '') {
    try {
      // Ensure file exists, create if not. Write empty string with preferred encoding.
      const exists = await ReactNativeBlobUtil.fs.exists(filePath);
      if (!exists) {
        await ReactNativeBlobUtil.fs.writeFile(filePath, '', LOG_FILE_ENCODING);
      }
      return; // Done.
    } catch (error) {
      console.warn(`[Logger] Failed to ensure empty file exists for append: ${filePath}`, error);
      // Continue to append attempt below, maybe it recovers.
    }
  }

  try {
    if (Platform.OS === 'android') {
      try {
        // Attempt 1: Try writing with preferred UTF-8 encoding on Android
        await ReactNativeBlobUtil.fs.appendFile(filePath, content, LOG_FILE_ENCODING);
      } catch (utf8Error: unknown) {
        // Attempt 2: UTF-8 failed, attempt fallback with Base64 encoding
        console.warn(
          `[Logger] UTF-8 append failed on Android for ${filePath}. Attempting base64 fallback. Error:`,
          utf8Error instanceof Error ? utf8Error.message : String(utf8Error),
        );
        try {
          const base64Data = Buffer.from(content, 'utf8').toString(LOG_FILE_ENCODING_FALLBACK);
          await ReactNativeBlobUtil.fs.appendFile(filePath, base64Data, LOG_FILE_ENCODING_FALLBACK);
          // console.debug(`[Logger] Successfully appended using base64 fallback to ${filePath}`);
        } catch (fallbackError: unknown) {
          // Base64 fallback also failed, log critical error and mark session invalid
          console.error(
            `[Logger] CRITICAL: Base64 append fallback also failed for ${filePath}. Logging potentially interrupted. Error:`,
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          );
          // Mark session as uninitialized to force re-attempt on next log
          isSessionInitialized = false;
          currentSessionLogPath = null;
          // Do not re-throw; allow app to continue, console logging might still work.
        }
      }
    } else {
      // For iOS and other platforms, use UTF-8 directly
      await ReactNativeBlobUtil.fs.appendFile(filePath, content, LOG_FILE_ENCODING);
    }
  } catch (error: unknown) {
    // Catch errors from non-Android append or initial file check errors propagating
    console.error(
      `[Logger] CRITICAL: Failed to append to log file ${filePath}. Logging potentially interrupted. Error:`,
      error instanceof Error ? error.message : String(error),
    );
    // Mark session as uninitialized if append fails, to force re-attempt next time.
    isSessionInitialized = false;
    currentSessionLogPath = null;
    // Do not re-throw here, allow logging to continue to console if possible.
  }
};

/**
 * Deletes old log files based on configured limits (count, age, size).
 * Called automatically after successful session initialization (`initSessionLog`)
 * and can also be invoked manually via `loggerInterface.cleanupOldLogs()` (though less common).
 *
 * Cleanup Rules (applied in order):
 * 1. **Count:** If total log files > `MAX_LOG_FILES`, delete oldest files until limit is met.
 * 2. **Age:** Delete remaining files (excluding current session) older than `MAX_LOG_AGE_DAYS`.
 * 3. **Size:** Delete remaining files (excluding current session) larger than `MAX_LOG_SIZE_MB`.
 *
 * @returns {Promise<void>} A promise that resolves when cleanup is complete. Errors during cleanup are logged internally but do not throw.
 * @category File Management
 * @see {@link MAX_LOG_FILES}
 * @see {@link MAX_LOG_AGE_DAYS}
 * @see {@link MAX_LOG_SIZE_MB}
 * @async
 */
export const cleanupOldLogs = async (): Promise<void> => {
  if (!logDirectoryPath) {
    // console.warn('[Logger] Cannot cleanup logs: Log directory path is not available.');
    return; // Can't proceed without the directory path
  }
  if (MAX_LOG_FILES <= 0 && MAX_LOG_AGE_DAYS <= 0 && MAX_LOG_SIZE_MB <= 0) {
    // console.debug('[Logger] Log cleanup skipped: All limits (MAX_LOG_FILES, MAX_LOG_AGE_DAYS, MAX_LOG_SIZE_MB) are disabled.');
    return;
  }

  // console.log(`[Logger] Starting log cleanup in directory: ${logDirectoryPath}`); // Less verbose
  try {
    const items = await ReactNativeBlobUtil.fs.ls(logDirectoryPath);
    // Filter items that match the log file naming pattern
    const logFileNames = items.filter(
      file => file.startsWith(LOG_FILE_PREFIX) && file.endsWith(LOG_FILE_SUFFIX),
    );

    if (logFileNames.length === 0) {
      // console.log('[Logger] No log files found matching pattern for cleanup.');
      return;
    }

    // Get details (stats, parsed date) for each log file
    const fileDetailsPromises = logFileNames.map(async name => {
      const filePath = `${logDirectoryPath}/${name}`;
      // Extract date from filename (e.g., "session_YYYY-MM-DD.txt")
      const dateMatch = name.match(/(\d{4}-\d{2}-\d{2})/);
      // Use start of day for consistent age comparison
      const date = dateMatch ? moment(dateMatch[1], 'YYYY-MM-DD').startOf('day') : moment(0); // Fallback to epoch if pattern fails
      let stats: ReactNativeBlobUtilStat | null = null;
      try {
        stats = await ReactNativeBlobUtil.fs.stat(filePath);
        if (!stats) throw new Error('Stat returned null'); // Handle null case
      } catch (statError: unknown) {
        console.warn(
          `[Logger] Could not get stats for file ${name} during cleanup, skipping file:`,
          statError,
        );
      }
      // Return null if stats failed, filter out later
      return stats ? { name, date, path: filePath, stats } : null;
    });

    // Wait for all stats promises and filter out any nulls (files that couldn't be stat'd)
    const detailedFiles = (await Promise.all(fileDetailsPromises)).filter(
      (
        f,
      ): f is { name: string; date: moment.Moment; path: string; stats: ReactNativeBlobUtilStat } =>
        !!f,
    );

    // Sort files by date (most recent first) for easier processing of limits
    detailedFiles.sort((a, b) => b.date.valueOf() - a.date.valueOf());

    const filesToDelete = new Set<string>(); // Use a Set to avoid duplicate deletion attempts
    let filesToKeep = [...detailedFiles]; // Start with all valid, sorted files

    // --- Apply Cleanup Rules ---

    // 1. Max File Count Rule (if enabled)
    if (MAX_LOG_FILES > 0 && filesToKeep.length > MAX_LOG_FILES) {
      const excessCount = filesToKeep.length - MAX_LOG_FILES;
      const oldestFiles = filesToKeep.slice(MAX_LOG_FILES); // Get the oldest files beyond the limit
      console.log(
        `[Logger] Max files (${MAX_LOG_FILES}) exceeded by ${excessCount}. Marking oldest for deletion.`,
      );
      oldestFiles.forEach(file => {
        // Crucially, never delete the currently active log file, even if it falls into the oldest list somehow
        if (file.path !== currentSessionLogPath) {
          filesToDelete.add(file.name);
        } else {
          // console.warn(`[Logger] Cleanup logic tried to delete the active log file (${file.name}) by count. Preventing deletion.`);
        }
      });
      // Update filesToKeep for subsequent checks (only keep the newest MAX_LOG_FILES count)
      filesToKeep = filesToKeep.slice(0, MAX_LOG_FILES);
    }

    // 2. Age and Size Rules (for remaining files, excluding the current session file)
    const today = moment().startOf('day'); // Use start of day for consistent age diff
    const currentFileName = currentSessionLogPath ? currentSessionLogPath.split('/').pop() : null;

    filesToKeep.forEach(file => {
      // Always skip the currently active log file from age/size deletion checks
      if (file.name === currentFileName) {
        return;
      }
      // Skip if already marked for deletion by count limit
      if (filesToDelete.has(file.name)) {
        return;
      }

      // Check Age (if enabled)
      if (MAX_LOG_AGE_DAYS > 0) {
        const daysOld = today.diff(file.date, 'days');
        if (daysOld > MAX_LOG_AGE_DAYS) {
          // console.log( // Less verbose
          //   `[Logger] Marking old log file ${file.name} (${daysOld} days old > ${MAX_LOG_AGE_DAYS}) for deletion.`,
          // );
          filesToDelete.add(file.name);
          return; // Mark for deletion and skip size check if already too old
        }
      }

      // Check Size (if enabled)
      if (MAX_LOG_SIZE_MB > 0) {
        const sizeMB = file.stats.size / (1024 * 1024);
        if (sizeMB > MAX_LOG_SIZE_MB) {
          // console.log( // Less verbose
          //   `[Logger] Marking large log file ${file.name} (${sizeMB.toFixed(2)} MB > ${MAX_LOG_SIZE_MB} MB) for deletion.`,
          // );
          filesToDelete.add(file.name);
        }
      }
    });

    // 3. Perform Deletions
    if (filesToDelete.size > 0) {
      console.log(`[Logger] Deleting ${filesToDelete.size} log file(s) based on cleanup rules...`);
      const deletePromises = Array.from(filesToDelete).map(filename =>
        // Use internal helper which handles errors gracefully
        deleteLogFileInternal(filename),
      );
      await Promise.all(deletePromises);
      console.log('[Logger] Finished deleting marked log files.');
    } else {
      // console.log('[Logger] No log files marked for deletion based on cleanup rules.'); // Less verbose
    }

    // console.log('[Logger] Log cleanup finished.'); // Less verbose
  } catch (error: unknown) {
    console.error('[Logger] Error during log cleanup process:', error);
    // Don't re-throw, allow application to continue.
  }
};

/**
 * Internal helper to delete a single log file by its name within the configured log directory.
 * Handles 'file not found' errors gracefully (considers them success). Logs other errors.
 * **Never deletes the currently active session log file.**
 * @internal
 * @param filename The name of the file to delete (e.g., `session_YYYY-MM-DD.txt`).
 * @returns {Promise<boolean>} True if deletion was successful or file didn't exist or was the active file, false on other errors or if deletion was skipped.
 * @async
 */
const deleteLogFileInternal = async (filename: string): Promise<boolean> => {
  if (!logDirectoryPath) {
    console.warn('[Logger] deleteLogFileInternal: Cannot delete, log directory path not set.');
    return false;
  }
  if (!filename || !filename.startsWith(LOG_FILE_PREFIX) || !filename.endsWith(LOG_FILE_SUFFIX)) {
    console.warn(
      `[Logger] deleteLogFileInternal: Invalid or empty filename provided: "${filename}"`,
    );
    return false;
  }

  const filePath = `${logDirectoryPath}/${filename}`;

  // Safety Check: Absolutely do not delete the currently active log file.
  if (filePath === currentSessionLogPath) {
    console.warn(
      `[Logger] deleteLogFileInternal: Attempted to delete the ACTIVE log file, skipping: ${filename}`,
    );
    return false; // Indicate deletion was skipped
  }

  try {
    // console.debug(`[Logger] Attempting to delete log file: ${filePath}`);
    await ReactNativeBlobUtil.fs.unlink(filePath);
    // console.log(`[Logger] Deleted log file: ${filename}`); // Less verbose
    return true;
  } catch (error: unknown) {
    // Check if the error is a 'file not found' error, which is acceptable.
    const errorMsg = String(error instanceof Error ? error.message : error).toLowerCase();
    // Common phrases indicating file not found across different systems/versions
    if (
      errorMsg.includes('exist') ||
      errorMsg.includes('not found') ||
      errorMsg.includes('no such file')
    ) {
      // console.debug(`[Logger] File not found during deletion attempt (already deleted?): ${filename}`);
      return true; // Consider success if file doesn't exist.
    }

    // Log other unexpected errors during deletion.
    console.error(`[Logger] Error deleting log file ${filename}:`, error);
    return false; // Indicate failure
  }
};

/**
 * Writes a prepared log entry (message content) to the current session file,
 * prepending timestamp and level. Handles session initialization automatically if needed.
 * Checks file size *after* writing and triggers session rollover for the *next* write if limit exceeded.
 * This is the primary function used by `log()` to persist messages to the filesystem.
 *
 * @param {string} message The plain text message content to write (should already be formatted, without colors).
 * @param {LogLevel} level The log level associated with the message ('debug', 'info', 'warn', 'error').
 * @returns {Promise<void>} A promise that resolves when the write operation (including potential init) is attempted. Errors are handled internally.
 * @category Core
 * @async
 */
export const writeToFile = async (message: string, level: LogLevel): Promise<void> => {
  // 1. Ensure Session is Initialized (or attempt to initialize)
  // This check handles cases where `log` is called before explicit `initSessionLog` or if a previous error invalidated the session.
  const needsInit = !isSessionInitialized || !currentSessionLogPath || !logDirectoryPath;
  if (needsInit) {
    // console.debug('[Logger] writeToFile called but session not initialized. Attempting initialization...');
    const initialized = await initSessionLog(); // Await initialization here
    if (!initialized || !currentSessionLogPath) {
      // Check state *after* awaiting init
      // Log error only if init *failed* and we still don't have a path.
      // console.error('[Logger] Cannot write to file: Session initialization failed or yielded no path.');
      // Avoid flooding console if init fails repeatedly. Init logs its own errors.
      return; // Bail out if init failed, cannot write.
    }
    // If init succeeded, state variables (isSessionInitialized, currentSessionLogPath, logDirectoryPath) are now set.
  }

  // Use non-null assertion for path, as the code block above ensures it's set if we reach here.
  const currentPath = currentSessionLogPath!;

  try {
    // 2. Prepare Log Entry for File
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
    // File Format: Timestamp [LEVEL] Actual message content
    const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}\n`; // Ensure newline

    // 3. Append to File (using helper for encoding safety)
    // First, verify file still exists (paranoid check against external deletion)
    const exists = await ReactNativeBlobUtil.fs.exists(currentPath);
    let pathToWrite = currentPath;

    if (!exists) {
      console.warn(
        `[Logger] Current log file (${currentPath}) disappeared unexpectedly. Re-initializing session before writing...`,
      );
      isSessionInitialized = false; // Mark for re-init
      const reinitialized = await initSessionLog(); // Attempt re-initialization
      if (!reinitialized || !currentSessionLogPath) {
        // Check path *again* after re-init attempt
        console.error(
          '[Logger] Failed to re-initialize session after file deletion. Cannot write current log entry.',
        );
        return; // Bail out if re-init fails
      }
      // Re-init succeeded, use the potentially updated path (though likely the same filename)
      pathToWrite = currentSessionLogPath!;
      // Log entry content remains the same, just writing to the newly ensured file path.
      await appendToFile(pathToWrite, logEntry);
    } else {
      // File exists, proceed with normal append using the helper
      await appendToFile(pathToWrite, logEntry);
    }

    // 4. Check File Size for Rollover (After successful write)
    if (MAX_LOG_SIZE_MB > 0 && isSessionInitialized) {
      // Only check if enabled and session is considered valid
      try {
        const stats = await ReactNativeBlobUtil.fs.stat(pathToWrite);
        if (stats && stats.size / (1024 * 1024) > MAX_LOG_SIZE_MB) {
          // console.log( // Less verbose
          //   `[Logger] Log file ${pathToWrite} reached size limit (${MAX_LOG_SIZE_MB}MB). ` +
          //     `Next log will trigger a new session file.`,
          // );
          // Mark session as needing re-initialization *for the next write*
          // This will cause the next call to initSessionLog (via writeToFile or direct call)
          // to potentially generate a new filename if the date window has also changed,
          // or simply re-initialize with the same name if the window hasn't changed (effectively just resetting state).
          // The desired behavior is typically to force a *new* file on size limit, which requires more complex filename generation (e.g., adding timestamps or counters).
          // Current simple behavior: Size limit simply forces re-check/re-init. If date window same, file reused. If different, new file used.
          // TO-DO: Implement true file rotation on size limit (e.g., session_YYYY-MM-DD_1.txt) if needed.
          isSessionInitialized = false;
          currentSessionLogPath = null; // Ensure new file path is determined next time
        }
      } catch (statError) {
        console.warn(
          `[Logger] Could not check file size for ${pathToWrite} after write:`,
          statError,
        );
      }
    }
  } catch (error: unknown) {
    // Catch errors specifically from the writeToFile logic (e.g., timestamp format, string concat)
    console.error('[Logger] Error preparing or writing log entry:', error);
    // Mark session as uninitialized if a significant error occurs during the write attempt
    isSessionInitialized = false;
    currentSessionLogPath = null;
  }
};

// --- Logger Interface Implementation ---

/**
 * Provides methods for interacting with the generated log files.
 * Allows retrieving file lists, reading content, and deleting files.
 * Accessed via the `loggerInterface` export from the library's main entry point.
 *
 * @example Using the LoggerInterface
 * ```typescript
 * import { loggerInterface, LoggerInterface } from 'react-native-beautiful-logs';
 *
 * async function manageLogs() {
 *   try {
 *     const files = await loggerInterface.getLogFiles();
 *     console.log("Available log files:", files);
 *
 *     if (files.length > 0) {
 *       const newestLogName = files[0]; // Files are sorted newest first
 *       console.log(`Reading content of ${newestLogName}...`);
 *       const content = await loggerInterface.readLogFile(newestLogName);
 *
 *       if (content) {
 *         console.log(`Content of ${newestLogName} (first 500 chars):\n`, content.substring(0, 500));
 *         // You could now upload content, display it, etc.
 *       } else {
 *         console.log(`Could not read or file empty: ${newestLogName}`);
 *       }
 *     }
 *
 *     // Example: Delete all logs except the current one
 *     // console.log("Deleting old logs...");
 *     // const deleted = await loggerInterface.deleteAllLogs();
 *     // console.log("Deletion successful:", deleted);
 *
 *   } catch (error) {
 *     console.error("Error managing logs:", error);
 *   }
 * }
 *
 * manageLogs();
 * ```
 *
 * @category File Management
 */
export const loggerInterface: LoggerInterface = {
  /** @inheritdoc */
  async getLogFiles() {
    // Ensure initialization is attempted if needed before listing
    if (!logDirectoryPath) {
      // console.debug('[Logger] Log directory not initialized, attempting init before getting log files.');
      const initialized = await initSessionLog();
      if (!initialized || !logDirectoryPath) {
        // Check path again after init attempt
        console.warn('[Logger] Initialization failed or yielded no path, cannot get log files.');
        return []; // Return empty array if dir isn't available
      }
    }

    try {
      // Use non-null assertion as we ensured initialization above
      const items = await ReactNativeBlobUtil.fs.ls(logDirectoryPath!);
      // Filter and sort the files based on the naming convention
      const logFiles = items
        .filter(file => file.startsWith(LOG_FILE_PREFIX) && file.endsWith(LOG_FILE_SUFFIX))
        .sort((a, b) => {
          // Extract date part (YYYY-MM-DD) for robust sorting
          const dateA = a.substring(LOG_FILE_PREFIX.length, a.length - LOG_FILE_SUFFIX.length);
          const dateB = b.substring(LOG_FILE_PREFIX.length, b.length - LOG_FILE_SUFFIX.length);
          // Compare strings lexicographically (YYYY-MM-DD format sorts correctly)
          // Sort descending for newest first
          return dateB.localeCompare(dateA);
        });

      return logFiles;
    } catch (error: unknown) {
      console.error('[Logger] Error listing log files:', error);
      return []; // Return empty array on error
    }
  },

  /** @inheritdoc */
  async getCurrentSessionLog() {
    // Ensure initialization is attempted if needed
    if (!currentSessionLogPath) {
      // console.debug('[Logger] No active session log path. Attempting init...');
      const initialized = await initSessionLog();
      if (!initialized || !currentSessionLogPath) {
        // Check path again after init attempt
        console.warn(
          '[Logger] Initialization failed or yielded no path, cannot get current session log path.',
        );
        return ''; // Return empty string if unavailable
      }
    }

    try {
      // Use non-null assertion as path is checked/set above
      const filename = currentSessionLogPath!.split('/').pop();
      if (!filename) {
        console.error('[Logger] Could not extract filename from current session path.');
        return ''; // Should not happen if path is valid
      }
      // Use the generic readLogFile method to benefit from its logic (encoding fallback etc.)
      const content = await this.readLogFile(filename);
      return content ?? ''; // Return empty string if readLogFile returns null
    } catch (error: unknown) {
      console.error('[Logger] Error reading current session log content:', error);
      return ''; // Return empty string on error
    }
  },

  /** @inheritdoc */
  async readLogFile(filename: string) {
    // Ensure initialization is attempted if needed (to get logDirectoryPath)
    if (!logDirectoryPath) {
      // console.debug('[Logger] Log directory not initialized, attempting init before reading file.');
      const initialized = await initSessionLog();
      if (!initialized || !logDirectoryPath) {
        // Check path again after init attempt
        console.warn('[Logger] Initialization failed or yielded no path, cannot read log file.');
        return null;
      }
    }

    // Basic filename format validation for robustness
    if (!filename || !filename.startsWith(LOG_FILE_PREFIX) || !filename.endsWith(LOG_FILE_SUFFIX)) {
      console.error(
        `[Logger] Invalid filename format provided to readLogFile: "${filename}". Expected format like "${LOG_FILE_PREFIX}YYYY-MM-DD${LOG_FILE_SUFFIX}".`,
      );
      return null; // Return null for invalid filename format
    }

    // Use non-null assertion for directory path
    const filePath = `${logDirectoryPath!}/${filename}`;

    try {
      const exists = await ReactNativeBlobUtil.fs.exists(filePath);
      if (!exists) {
        // console.warn(`[Logger] Log file not found for reading: ${filePath}`);
        return null; // File doesn't exist
      }

      const stats = await ReactNativeBlobUtil.fs.stat(filePath);
      // Check if stat succeeded and file has size. (Stat might return undefined on error)
      if (!stats || stats.size === 0) {
        // console.warn(`[Logger] Log file is empty or failed to stat: ${filePath}`);
        // Optionally, delete empty files here? Could be unexpected side effect.
        // await deleteLogFileInternal(filename);
        return null; // File is empty or stat failed
      }

      // Read file content, handling potential Base64 encoding on Android
      let content: string | null = null;

      if (Platform.OS === 'android') {
        try {
          // Attempt 1: Read as UTF-8 first
          content = await ReactNativeBlobUtil.fs.readFile(filePath, LOG_FILE_ENCODING);
        } catch (utf8Error: unknown) {
          // Attempt 2: UTF-8 read failed, try reading as Base64 and decoding
          console.warn(
            `[Logger] UTF-8 read failed for ${filename} on Android. Attempting base64 fallback decode. Error:`,
            utf8Error instanceof Error ? utf8Error.message : String(utf8Error),
          );
          try {
            const base64Content = await ReactNativeBlobUtil.fs.readFile(
              filePath,
              LOG_FILE_ENCODING_FALLBACK, // Read as base64 string
            );
            // Decode the base64 string back to UTF-8
            content = Buffer.from(base64Content, LOG_FILE_ENCODING_FALLBACK).toString(
              LOG_FILE_ENCODING, // Decode *into* UTF-8
            );
            // console.debug(`[Logger] Successfully read and decoded base64 content from ${filename}`);
          } catch (base64Error: unknown) {
            console.error(
              `[Logger] Base64 read fallback also failed for ${filename}. Cannot read file content.`,
              base64Error,
            );
            return null; // Return null if both UTF-8 and Base64 read attempts fail
          }
        }
      } else {
        // For iOS and other platforms, read directly as UTF-8
        content = await ReactNativeBlobUtil.fs.readFile(filePath, LOG_FILE_ENCODING);
      }

      // Final check: Read operation might succeed but yield null or empty string (less likely now with size check)
      if (content === null || content.trim() === '') {
        // console.warn(`[Logger] Read operation resulted in null or effectively empty content for: ${filePath}`);
        return null; // Treat effectively empty content as null
      }

      return content; // Return the successfully read and decoded content
    } catch (error: unknown) {
      console.error(`[Logger] Error reading log file ${filename}:`, error);
      return null; // Return null on any unexpected error during read process
    }
  },

  /** @inheritdoc */
  async deleteLogFile(filename: string) {
    // Ensure initialization is attempted if needed (to get logDirectoryPath and currentSessionLogPath)
    if (!logDirectoryPath) {
      // console.debug('[Logger] Log directory not initialized, attempting init before deleting file.');
      const initialized = await initSessionLog();
      if (!initialized || !logDirectoryPath) {
        // Check path again after init attempt
        console.warn('[Logger] Initialization failed or yielded no path, cannot delete log file.');
        return false;
      }
    }

    // Filename validation happens within deleteLogFileInternal
    // Safety check for active file also happens within deleteLogFileInternal

    // Use the internal helper which includes safety checks and error handling
    return deleteLogFileInternal(filename);
  },

  /** @inheritdoc */
  async deleteAllLogs() {
    // Ensure initialization is attempted if needed (to get file list and current path)
    if (!logDirectoryPath) {
      // console.debug('[Logger] Log directory not initialized, attempting init before deleting all logs.');
      const initialized = await initSessionLog();
      if (!initialized || !logDirectoryPath) {
        // Check path again after init attempt
        console.warn('[Logger] Initialization failed or yielded no path, cannot delete logs.');
        return false;
      }
    }

    try {
      // Get the list of all log files first
      const files = await this.getLogFiles(); // Already sorted newest first
      const currentFileName = currentSessionLogPath ? currentSessionLogPath.split('/').pop() : null;

      if (files.length === 0 || (files.length === 1 && files[0] === currentFileName)) {
        console.log('[Logger] No non-active log files found to delete.');
        return true; // Nothing to delete or only the active file exists
      }

      const deletePromises: Promise<boolean>[] = [];
      let deleteCount = 0;
      for (const filename of files) {
        // Use the internal delete function which skips the active file automatically
        if (filename !== currentFileName) {
          deletePromises.push(deleteLogFileInternal(filename));
          deleteCount++;
        }
      }

      if (deletePromises.length > 0) {
        console.log(`[Logger] Attempting to delete ${deleteCount} non-active log file(s)...`);
        const results = await Promise.all(deletePromises);
        // Check if all attempted deletions succeeded (or file was already gone)
        const allSucceeded = results.every(success => success);
        if (allSucceeded) {
          console.log('[Logger] Finished deleting all non-active log files successfully.');
        } else {
          console.warn(
            '[Logger] Finished deleting non-active logs, but some deletions may have failed (check previous errors).',
          );
        }
        return allSucceeded;
      } else {
        // This case should be caught earlier, but added for completeness
        console.log('[Logger] No non-active log files were found to delete.');
        return true;
      }
    } catch (error: unknown) {
      console.error('[Logger] Error during deleteAllLogs operation:', error);
      return false;
    }
  },

  /** @inheritdoc */
  async cleanupCurrentSession() {
    // console.log('[Logger] Cleaning up current session state...'); // Less verbose
    if (currentSessionLogPath && logDirectoryPath) {
      const filename = currentSessionLogPath.split('/').pop();
      if (filename) {
        try {
          const stats = await ReactNativeBlobUtil.fs.stat(currentSessionLogPath);
          // Check if the file exists and is empty (or stat failed)
          if (!stats || stats.size === 0) {
            // console.log( // Less verbose
            //   `[Logger] Current session log file ${filename} is empty or stat failed, deleting it during cleanup.`,
            // );
            // Use internal delete which *won't* delete the active file path normally,
            // but since we are cleaning up the *session state* afterwards, it's okay to try deleting it if empty.
            // Temporarily clear currentSessionLogPath to allow deletion by the internal helper.
            const pathToDelete = currentSessionLogPath;
            currentSessionLogPath = null; // Allow deletion temporarily
            await deleteLogFileInternal(filename); // Attempt deletion
            currentSessionLogPath = pathToDelete; // Restore path momentarily if needed (though state is reset below)
          }
        } catch (error: unknown) {
          // Ignore errors if file doesn't exist (already deleted?) or stat fails. Log other errors.
          const errorMsg = String(error instanceof Error ? error.message : error).toLowerCase();
          if (
            !errorMsg.includes('exist') &&
            !errorMsg.includes('not found') &&
            !errorMsg.includes('no such file')
          ) {
            console.warn(
              `[Logger] Could not stat or delete current session file ${filename} during cleanup. Error:`,
              error instanceof Error ? error.message : String(error),
            );
          }
        }
      }
    }
    // Always reset internal state regardless of file deletion outcome.
    // This ensures that the next log() or initSessionLog() call starts fresh.
    currentSessionLogPath = null;
    isSessionInitialized = false;
    // Keep `logDirectoryPath`? It might be reused on the next init. Resetting it forces rediscovery. Let's keep it for potential optimization.
    // logDirectoryPath = null;
    console.log('[Logger] Session state has been reset.');
  },
};
