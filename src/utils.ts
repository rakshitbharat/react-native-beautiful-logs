/**
 * @fileoverview Utility functions supporting the logging library.
 * Includes functions for formatting log messages for console output,
 * handling dates for filename generation, manipulating strings (stripping ANSI codes),
 * and formatting JavaScript objects/values into colorized JSON strings.
 * @category Utilities
 */

import moment from 'moment';
// Import constants needed for formatting and filename generation
import { COLORS, LOG_FILE_PREFIX, LOG_FILE_SUFFIX } from './constants';
import { LogLevel } from './types';

/**
 * Calculates the "base date" used for determining the current log file session name.
 * Log files cover a 2-day window based on odd/even days of the month to reduce
 * file creation/churn exactly at midnight.
 *
 * - If the current day of the month is **odd** (1st, 3rd, 5th, ...), the base date is **today**.
 * - If the current day of the month is **even** (2nd, 4th, 6th, ...), the base date is **yesterday**.
 *
 * This means logs generated on both the 1st and 2nd of the month go into the file
 * named with the 1st's date (e.g., `session_YYYY-MM-01.txt`). Logs from the 3rd and 4th
 * go into the file named with the 3rd's date (e.g., `session_YYYY-MM-03.txt`), and so on.
 *
 * @internal Used internally by {@link generateLogFilename}. Not intended for public use.
 * @returns {moment.Moment} A Moment.js object representing the base date for the current log file window.
 */
export const getBaseLogDate = (): moment.Moment => {
  const today = moment(); // Get current date and time
  const dayOfMonth = today.date(); // Get the day of the month (1-31)

  // Determine base date: today if odd day, yesterday if even day.
  // Clone moment object when modifying to avoid side effects if `today` is used elsewhere.
  return dayOfMonth % 2 !== 0 ? today : today.clone().subtract(1, 'day');
};

/**
 * Generates the log filename for the current 2-day logging window based on the current date.
 * The format is constructed using:
 * - `LOG_FILE_PREFIX` (e.g., "session_")
 * - The base date calculated by `getBaseLogDate()` formatted as 'YYYY-MM-DD'
 * - `LOG_FILE_SUFFIX` (e.g., ".txt")
 *
 * @internal Used internally by `fileManager.ts` during session initialization (`initSessionLog`).
 * @returns {string} The calculated log filename (e.g., `session_2024-01-15.txt`).
 * @see {@link getBaseLogDate} - Calculates the date used in the filename.
 * @see {@link LOG_FILE_PREFIX}
 * @see {@link LOG_FILE_SUFFIX}
 */
export const generateLogFilename = (): string => {
  const baseDate = getBaseLogDate();
  const formattedDate = baseDate.format('YYYY-MM-DD');
  // Use imported constants for prefix and suffix
  return `${LOG_FILE_PREFIX}${formattedDate}${LOG_FILE_SUFFIX}`;
};

/**
 * Formats a JavaScript value (object, array, primitive) into a colorized JSON string,
 * suitable for printing to a terminal that supports ANSI color codes (like the RN Metro console).
 * Uses colors defined in the `COLORS` constant for syntax highlighting.
 * Handles basic types (string, number, boolean, null) and nested object/array structures.
 * Gracefully handles `undefined` values and errors during `JSON.stringify`.
 *
 * @param obj - The value (object, array, primitive, null, undefined) to format. Accepts `unknown` type.
 * @returns {string} A colorized string representation of the value for console output.
 *          Returns `'undefined'` (colored) for `undefined` input.
 *          Returns `'[Error formatting JSON]'` (colored) if `JSON.stringify` fails.
 * @see {@link COLORS} - Contains the color definitions used.
 * @see {@link formatConsoleMessage} - Uses this function to format object/array parts of log messages.
 *
 * @example
 * ```typescript
 * const myData = { name: "Example", count: 42, active: true, items: [1, null, 'test'] };
 * const coloredJson = formatJSON(myData);
 * console.log("Formatted Data:\n" + coloredJson);
 * // Output (in a compatible terminal) will show the object with colored keys, strings, numbers, etc.
 *
 * console.log(formatJSON(undefined)); // Outputs colored 'undefined'
 * ```
 */
export const formatJSON = (obj: unknown): string => {
  try {
    // Handle `undefined` explicitly, as JSON.stringify converts it differently depending on context.
    if (obj === undefined) {
      return `${COLORS.dim}undefined${COLORS.reset}`;
    }

    // Use JSON.stringify with indentation (2 spaces) and a basic replacer (currently identity).
    // Consider adding a more robust replacer for complex circular refs or custom serializers if needed.
    const jsonString = JSON.stringify(
      obj,
      (_key, value) => {
        // Placeholder for future enhancements like circular reference handling or BigInt serialization
        // if (typeof value === 'bigint') return value.toString() + 'n'; // Example for BigInt
        return value;
      },
      2, // Indentation level for readability
    );

    // Handle cases where stringify might return undefined (e.g., stringifying a lone function)
    if (jsonString === undefined) {
      return `${COLORS.dim}undefined${COLORS.reset}`;
    }

    // Apply syntax highlighting using regular expressions to match JSON components.
    // Regex Breakdown:
    // ("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)? ) -> Matches JSON strings (including keys with ':')
    // | \b(true|false|null)\b -> Matches boolean literals or null
    // | -?\d+(?:\.\d*)?(?:[eE][+-]?\d+)? -> Matches JSON numbers (integers, decimals, exponents)
    return jsonString.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match): string => {
        let color = COLORS.jsonNumber; // Default assumption: number
        if (/^"/.test(match)) {
          // It's a string. Check if it ends with ':' to determine if it's a key.
          color = /:$/.test(match) ? COLORS.jsonKey : COLORS.jsonString;
        } else if (/true|false/.test(match)) {
          // It's a boolean.
          color = COLORS.jsonBoolean;
        } else if (/null/.test(match)) {
          // It's null.
          color = COLORS.jsonNull;
        }
        // Apply the determined color and reset at the end.
        return `${color}${match}${COLORS.reset}`;
      },
    );
  } catch (error) {
    // Handle errors during the stringification process itself (e.g., complex circular structures)
    console.warn('[Logger Utils] Error formatting value to JSON:', error);
    return `${COLORS.error}[Error formatting JSON]${COLORS.reset}`;
  }
};

/**
 * Formats the complete log message string intended for console output.
 * Includes:
 * - Timestamp (HH:MM:SS.ms) with color.
 * - Log level indicator (Symbol + Padded Level Name) with color.
 * - Module name (if provided as `[ModuleName]` prefix) with color.
 * - An arrow separator `→`.
 * - The message parts, formatted appropriately:
 *   - Strings are included as-is.
 *   - Numbers/Booleans are colored.
 *   - `null`/`undefined` are represented and colored.
 *   - `Error` objects are formatted with name, message, and stack trace (colored and indented).
 *   - Other objects/arrays are formatted using `formatJSON` (colored and indented with a vertical bar).
 *
 * @param level - The log level (`'debug'`, `'info'`, `'warn'`, `'error'`).
 * @param messageParts - An array of the original arguments passed to the `log` function (after potentially extracting the level). Should handle `unknown[]`.
 * @param symbols - A map of log levels to their corresponding emoji symbols (from `SYMBOLS` constant).
 * @returns {string} The fully formatted and colorized log string ready for `console.log`, `console.warn`, etc.
 *
 * @example Output Structure
 * ```console
 * 14:05:10.345 📱 INFO  [Network] → Request successful: { response data... }
 * 14:05:12.100 ❌ ERROR [AuthService] → Login failed:
 * │  Error: Invalid credentials
 * │    at loginUser (auth.js:42)
 * │    at processRequest (server.js:101)
 * ```
 */
export const formatConsoleMessage = (
  level: LogLevel,
  messageParts: unknown[], // Accept unknown[] for type safety
  symbols: Record<LogLevel, string>,
): string => {
  // 1. Timestamp (e.g., 14:35:01.123)
  const timestamp = moment().format('HH:mm:ss.SSS');
  const coloredTimestamp = `${COLORS.timestamp}${timestamp}${COLORS.reset}`;

  // 2. Level Indicator (e.g., ⚠️ WARN )
  const levelUpper = level.toUpperCase().padEnd(5); // Pad for alignment (INFO , WARN , ERROR)
  const levelColor = COLORS[level] || COLORS.info; // Fallback color if level invalid
  const levelSymbol = symbols[level] || '?'; // Fallback symbol
  const coloredLevel = `${levelColor}${COLORS.bright}${levelSymbol} ${levelUpper}${COLORS.reset}`; // Brighten symbol and text

  // 3. Module Name Extraction (e.g., [AuthService])
  // Look for "[ModuleName]" pattern in the *first* message part if it's a string.
  let moduleName = 'App'; // Default module name if none provided
  let processedMessageParts = [...messageParts]; // Create a mutable copy

  if (messageParts.length > 0 && typeof messageParts[0] === 'string') {
    // Regex: ^\[ Match start, literal '[', (.*?) capture non-greedily any chars, \] Match literal ']', $ Match end.
    const moduleMatch = messageParts[0].match(/^\[([^\]]+)\]$/); // Allow non-word chars in module name
    if (moduleMatch && moduleMatch[1]) {
      // Ensure captured group is not empty
      moduleName = moduleMatch[1]; // Use the captured group
      processedMessageParts = messageParts.slice(1); // Remove the module part from the message body
      // Handle case where log was *only* the module name (e.g., log('[Network]'))
      if (processedMessageParts.length === 0) {
        processedMessageParts.push('(Module marker only)'); // Add placeholder content
      }
    }
  }
  // Apply color to module name text, keep brackets dimmed
  const coloredModuleName = `${levelColor}${COLORS.bright}${moduleName}${COLORS.reset}`;
  const moduleDisplay = `${COLORS.dim}[${coloredModuleName}]${COLORS.reset}`;

  // 4. Header (Timestamp Level [Module] ->)
  const header = `${coloredTimestamp} ${coloredLevel} ${moduleDisplay} ${COLORS.dim}→${COLORS.reset}`; // Dim the arrow

  // 5. Format Message Parts
  const formattedParts = processedMessageParts.map((part, index) => {
    // Handle null and undefined explicitly
    if (part === null) return `${COLORS.jsonNull}null${COLORS.reset}`;
    if (part === undefined) return `${COLORS.dim}undefined${COLORS.reset}`;

    // Keep strings as they are (colors within them will be preserved)
    if (typeof part === 'string') return part;

    // Color primitive numbers and booleans inline
    if (typeof part === 'number') return `${COLORS.jsonNumber}${part}${COLORS.reset}`;
    if (typeof part === 'boolean') return `${COLORS.jsonBoolean}${part}${COLORS.reset}`;

    // Format Error objects nicely
    if (part instanceof Error) {
      // Start with Error Name and Message, colored appropriately
      let errorString = `${COLORS.error}${part.name}: ${part.message}${COLORS.reset}`;
      if (part.stack) {
        // Format stack trace: skip first line (already have name/message), indent, dim, color reset
        const stackLines = part.stack
          .split('\n')
          .slice(1) // Skip the first line (e.g., "Error: Message")
          .map(line => `${COLORS.dim}  ${line.trim()}${COLORS.reset}`) // Indent and dim each line
          .join('\n'); // Join lines back together
        if (stackLines) {
          // Only add stack if it's not empty after processing
          errorString += `\n${stackLines}`;
        }
      }
      // Add a newline before the error object if it's not the first part of the message, for better separation.
      return (index > 0 ? '\n' : '') + errorString;
    }

    // Format other objects and arrays using colored JSON
    if (typeof part === 'object') {
      // Catches objects and arrays (which are objects)
      try {
        const formattedJson = formatJSON(part); // Get colorized JSON string
        // Indent multi-line JSON output with a vertical bar prefix using the level's color
        const indentedJson = formattedJson
          .split('\n')
          .map(line => `${levelColor}│${COLORS.reset}  ${line}`) // Use level color for the bar
          .join('\n');
        // Add a newline before the object if it's not the first part, for better separation.
        return (index > 0 ? '\n' : '') + indentedJson;
      } catch (err) {
        // Fallback if formatJSON itself throws an unexpected error (should be caught internally though)
        return `${COLORS.error}[Error formatting object]${COLORS.reset}`;
      }
    }

    // Fallback for any other types (Symbols, Functions, etc.) - try to convert to string
    try {
      return String(part);
    } catch {
      return `${COLORS.error}[Unstringifiable Value]${COLORS.reset}`;
    }
  });

  // Combine header and formatted parts with spaces
  // Use reduce for slightly cleaner handling of potential leading/trailing spaces from parts
  return formattedParts.reduce((acc, part) => `${acc} ${part}`, header);
};

/**
 * Removes ANSI escape codes (used for terminal colors and styles) from a string.
 * This is essential for preparing console output for storage in plain text log files,
 * ensuring readability without terminal control characters.
 *
 * @param message - The string that might contain ANSI escape codes (e.g., `\x1b[32mHello\x1b[0m`).
 * @returns {string} The input string with all ANSI color/style codes stripped out (e.g., `Hello`).
 *
 * @example
 * ```typescript
 * const coloredMessage = "\x1b[31mError:\x1b[0m Something went wrong.";
 * const plainTextMessage = stripAnsiCodes(coloredMessage);
 * // plainTextMessage will be: "Error: Something went wrong."
 * ```
 */
export const stripAnsiCodes = (message: string): string => {
  // Regex to match ANSI escape codes. It matches the escape character `\x1b` (or `\033`),
  // followed by `[` , then any number of digits (0-9) and semicolons (;),
  // ending with the command character `m`.
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /\x1b(?:\[[0-9;]*m)/g;
  return message.replace(ansiRegex, '');
};
