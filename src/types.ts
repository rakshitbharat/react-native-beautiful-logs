/**
 * @fileoverview Defines the core TypeScript types and interfaces used by the
 * `react-native-beautiful-logs` library. These types ensure strong typing
 * and improve developer experience when using the library's functions and interfaces.
 * @category Types
 */

/**
 * Represents the different levels of logging severity, used to categorize messages.
 *
 * - `debug`: Detailed information useful for developers during debugging. Typically filtered out in production builds or less verbose modes. (e.g., variable states, detailed steps).
 * - `info`: General informational messages about application state, progress, or significant events. (e.g., 'Application started', 'User logged in', 'Data sync complete').
 * - `warn`: Indicates potential issues, unexpected situations, or non-critical errors that don't necessarily halt execution but should be noted. (e.g., 'Configuration value missing, using default', 'API request took too long').
 * - `error`: Signals significant errors, failures, or exceptions that likely impact functionality or stability. (e.g., 'Failed to connect to server', 'Error processing data', caught exceptions).
 *
 * @category Types
 * @public
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Defines the programmatic interface for interacting with stored log files.
 * Provides methods for listing, reading, and deleting log files, as well as managing
 * the current logging session.
 *
 * This interface is implemented by the `loggerInterface` object exported from the library index.
 *
 * @example Using the LoggerInterface to Display Logs
 * ```typescript
 * import React, { useState, useEffect } from 'react';
 * import { ScrollView, Text, Button } from 'react-native';
 * import { loggerInterface, LoggerInterface } from 'react-native-beautiful-logs';
 *
 * const LogViewer: React.FC = () => {
 *   const [logFiles, setLogFiles] = useState<string[]>([]);
 *   const [selectedLogContent, setSelectedLogContent] = useState<string | null>(null);
 *   const [loading, setLoading] = useState(false);
 *
 *   const loadFiles = async () => {
 *     setLoading(true);
 *     setLogFiles(await loggerInterface.getLogFiles());
 *     setLoading(false);
 *   };
 *
 *   const loadContent = async (filename: string) => {
 *     setLoading(true);
 *     setSelectedLogContent(await loggerInterface.readLogFile(filename));
 *     setLoading(false);
 *   };
 *
 *   useEffect(() => {
 *     loadFiles();
 *   }, []);
 *
 *   return (
 *     <ScrollView>
 *       <Button title="Refresh Files" onPress={loadFiles} disabled={loading} />
 *       {logFiles.map(file => (
 *         <Button key={file} title={`Load ${file}`} onPress={() => loadContent(file)} disabled={loading} />
 *       ))}
 *       {loading && <Text>Loading...</Text>}
 *       {selectedLogContent && (
 *         <Text selectable>{selectedLogContent}</Text>
 *       )}
 *     </ScrollView>
 *   );
 * };
 * ```
 * @category File Management
 * @category Types
 * @public
 */
export interface LoggerInterface {
  /**
   * Retrieves a list of all available log filenames found in the configured log directory.
   * The filenames match the pattern `session_YYYY-MM-DD.txt`.
   * The list is sorted chronologically with the newest log file (based on filename date) appearing first.
   *
   * @returns A promise resolving to an array of log filenames (e.g., `['session_2024-01-17.txt', 'session_2024-01-15.txt']`).
   *          Returns an empty array (`[]`) if no log files are found or if an error occurs during listing (errors are logged internally).
   * @async
   * @see {@link loggerInterface.getLogFiles} (in fileManager.ts) for implementation details.
   */
  getLogFiles(): Promise<string[]>;

  /**
   * Reads the entire content of the log file currently being used for this active application session.
   * This is useful for quickly accessing the logs generated since the app was last initialized.
   *
   * @returns A promise resolving to the content of the current log file as a single string.
   *          Returns an empty string (`""`) if the session is not initialized, the current log path is unavailable,
   *          the file cannot be read, or an error occurs (errors are logged internally).
   * @async
   * @see {@link loggerInterface.getCurrentSessionLog} (in fileManager.ts) for implementation details.
   */
  getCurrentSessionLog(): Promise<string>;

  /**
   * Reads the entire content of a specific log file identified by its filename.
   * Automatically handles potential Base64 encoding fallback used on Android during file writing.
   *
   * @param filename The exact name of the log file to read (e.g., `'session_2024-01-15.txt'`).
   *                 Must follow the library's naming convention (`session_YYYY-MM-DD.txt`).
   * @returns A promise resolving to the file content as a string if successful.
   *          Resolves to `null` if:
   *          - The file does not exist.
   *          - The filename format is invalid.
   *          - The file is empty.
   *          - A read error occurs (errors are logged internally).
   *          - Base64 decoding fails (if applicable).
   * @async
   * @see {@link loggerInterface.readLogFile} (in fileManager.ts) for implementation details.
   */
  readLogFile(filename: string): Promise<string | null>;

  /**
   * Deletes a specific log file identified by its filename.
   * **Important Safety Feature:** This method will *refuse* to delete the log file
   * that is currently being written to by the active session. Attempts to delete the
   * active file will return `false` and log a warning.
   *
   * @param filename The name of the log file to delete (e.g., `'session_2024-01-13.txt'`).
   * @returns A promise resolving to:
   *          - `true` if the deletion was successful.
   *          - `true` if the file did not exist (considered successful deletion).
   *          - `false` if the filename specified is the currently active log file.
   *          - `false` if a filesystem error occurred during deletion (errors logged internally).
   * @async
   * @see {@link loggerInterface.deleteLogFile} (in fileManager.ts) for implementation details.
   */
  deleteLogFile(filename: string): Promise<boolean>;

  /**
   * Deletes all log files found in the log directory *except* for the log file
   * associated with the currently active session. This is useful for cleaning up
   * old logs without interrupting current logging.
   *
   * @returns A promise resolving to `true` if all eligible (non-active) files were
   *          deleted successfully (or if there were no eligible files to delete).
   *          Resolves to `false` if any deletion failed (errors are logged internally).
   * @async
   * @see {@link loggerInterface.deleteAllLogs} (in fileManager.ts) for implementation details.
   */
  deleteAllLogs(): Promise<boolean>;

  /**
   * Performs cleanup actions related to the *current* logging session state.
   * Specifically, it checks if the current session log file exists and is empty.
   * If it is empty, the file is deleted.
   * Regardless of file deletion, it resets internal session flags (`isSessionInitialized`, `currentSessionLogPath`),
   * effectively forcing the library to re-initialize (check/create directory and file)
   * on the next call to `log()` or `initSessionLog()`.
   *
   * This can be useful before performing actions like uploading logs to ensure
   * the session state is clean, or for manually resetting the logging state.
   *
   * @returns A promise resolving when the cleanup actions are complete. Does not typically reject, errors are logged internally.
   * @async
   * @see {@link loggerInterface.cleanupCurrentSession} (in fileManager.ts) for implementation details.
   */
  cleanupCurrentSession(): Promise<void>;
}

/**
 * Defines potential configuration options for the logger library.
 * **Note:** This interface is defined for future expansion and is **not currently used**
 * by any configuration function within the library. Settings are currently controlled
 * only by the constants defined in `constants.ts`.
 *
 * @category Configuration
 * @category Types
 * @public
 */
export interface LoggerConfig {
  /**
   * An array of strings to filter logs by. Logs containing any of these strings (case-insensitive)
   * will be skipped. Call `configureLogger` to set this dynamically.
   * @see {@link LOG_FILTERS}
   * @see {@link configureLogger}
   */
  logFilters?: string[];

  /**
   * Maximum number of log files to keep during cleanup.
   * Would override the `MAX_LOG_FILES` constant if implemented.
   * @see {@link MAX_LOG_FILES}
   */
  maxLogFiles?: number;

  /**
   * Maximum size (in MB) for a single log file before triggering rollover on the next write.
   * Would override the `MAX_LOG_SIZE_MB` constant if implemented.
   * @see {@link MAX_LOG_SIZE_MB}
   */
  maxLogSizeMB?: number;

  /**
   * Allows specifying a custom base directory for storing logs (e.g., 'Documents/MyAppLogs').
   * Would override the platform defaults logic defined by `DEFAULT_LOG_DIR_BASE` and `FALLBACK_DIRS`
   * if implemented. Use with caution, ensuring the specified path is writable by the application.
   * Example: `ReactNativeBlobUtil.fs.dirs.CacheDir + '/custom-app-logs'`
   * @see {@link DEFAULT_LOG_DIR_BASE}
   * @see {@link FALLBACK_DIRS}
   */
  logDirectoryBase?: string;
}
