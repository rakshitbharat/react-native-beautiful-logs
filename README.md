# React Native Beautiful Logs 🌈✨

<div align="center">
  <img src="https://img.shields.io/npm/v/react-native-beautiful-logs" alt="npm version" />
  <img src="https://img.shields.io/npm/dt/react-native-beautiful-logs" alt="downloads" />
  <img src="https://img.shields.io/github/license/rakshitbharat/react-native-beautiful-logs" alt="license" />
  <img src="https://img.shields.io/github/issues/rakshitbharat/react-native-beautiful-logs" alt="issues" />
  <img src="https://img.shields.io/github/stars/rakshitbharat/react-native-beautiful-logs" alt="stars" />
</div>

<p align="center">
  <strong>Stop boring logs! A ridiculously elegant logging library for React Native that's both beautiful and functional. 💅</strong>
</p>

<p align="center">
  Stunning Console Output • Smart Formatting • Module Tagging • Persistent File Logging • Automatic Cleanup • Typed API
</p>

<hr />

Tired of `console.log` clutter? `react-native-beautiful-logs` elevates your debugging experience with gorgeous, organized console output and robust file logging capabilities, all with a simple and intuitive API.

## ✨ Features

- 🎨 **Eye-Catching Console Logs:** Configurable ANSI colors, timestamps, log levels with emojis (🔍📱⚠️❌), and clear module tagging make reading logs a joy, not a chore.
- 🏷️ **Module Tagging:** Easily identify log origins using `[ModuleName]` prefixes (e.g., `log('info', '[AuthService]', 'Login successful')`).
- 🧠 **Smart Formatting:** Automatically pretty-prints Objects, Arrays, and Errors in the console _and_ file logs for maximum readability.
- 💾 **Persistent File Logging:** Logs are automatically saved to platform-appropriate locations (`Documents` on iOS, `Cache` on Android).
- 🔄 **Automatic File Management:** Built-in log rotation and cleanup based on file count, age, and size limits. Set it and forget it!
- 🛠️ **Robust & Resilient:** Handles Android encoding fallbacks (UTF-8/Base64) and filesystem errors gracefully. Asynchronous operations ensure logging doesn't block your UI.
- 📂 **File Management Interface:** Programmatically access log files (`getLogFiles`, `readLogFile`, `deleteLogFile`, `deleteAllLogs`) via the `loggerInterface`.
- ⚙️ **Configurable Filtering:** Easily filter out noisy logs by defining substrings in the `LOG_FILTERS` constant.
- 🔒 **Typed API:** Written entirely in TypeScript for excellent developer experience and type safety.

## 🚀 Installation

1.  **Install the library:**

    ```bash
    # Using npm
    npm install react-native-beautiful-logs

    # Using yarn
    yarn add react-native-beautiful-logs

    # Using bun
    bun add react-native-beautiful-logs
    ```

2.  **Install Required Peer Dependency:** This library uses `react-native-blob-util` for file operations.

    ```bash
    npm install react-native-blob-util
    # or
    yarn add react-native-blob-util
    # or
    bun add react-native-blob-util
    ```

3.  **Link Native Modules (for react-native-blob-util):** Follow the installation instructions for `react-native-blob-util`, which usually involves `cd ios && pod install`.

## 💡 Quick Start

```typescript
import { log, initSessionLog, loggerInterface } from 'react-native-beautiful-logs';
import type { LogLevel } from 'react-native-beautiful-logs'; // Import types if needed

// Optional but recommended: Initialize early in your app (e.g., index.js or App.tsx)
// This ensures the log file is ready immediately.
initSessionLog().then(success => {
  if (success) {
    log('[AppSetup]', 'File logging session initialized successfully!');
  } else {
    console.warn('[AppSetup] File logging session failed to initialize.'); // Use console directly if logger failed
  }
});

// --- Basic Logging ---

// Log simple messages (defaults to 'info' level)
log('Application mounted.');

// Use module tags for context (still 'info' level)
log('[AuthScreen]', 'Login button pressed.');

// --- Logging with Levels & Data ---

const user = { id: 101, name: 'Alice', roles: ['admin', 'editor'] };
const apiError = new Error('Network request failed: Status 404');

log('debug', '[APIClient]', 'Sending request to /users/101');
log('info', '[AuthScreen]', 'Login successful for user:', user.name, { userId: user.id });
log('warn', '[Settings]', 'Deprecated theme value detected, using default.');
log('error', '[APIClient]', 'Failed to fetch user profile:', apiError);

// --- Accessing Log Files ---
async function shareLatestLog() {
  const files = await loggerInterface.getLogFiles(); // Sorted newest first
  if (files.length > 0) {
    const latestLog = files[0];
    const content = await loggerInterface.readLogFile(latestLog);
    if (content) {
      console.log(`Sharing log file: ${latestLog}`);
      // Add your sharing logic here (e.g., using react-native-share)
      // Share.open({ title: 'App Logs', message: 'Debug logs attached', url: `file://${loggerInterface.logDirectoryPath}/${latestLog}` });
    }
  }
}
```

## 📖 API Documentation

### Core Functions

**`log(levelOrMessage: LogLevel | unknown, ...args: unknown[]): void`**

The primary function for logging.

- **Level Handling:**
  - If the first argument is a valid `LogLevel` ('debug', 'info', 'warn', 'error'), it's used as the level.
  - Otherwise, the level defaults to `'info'`, and the first argument is treated as part of the message.
- **Module Tagging (Recommended):** Include a tag like `[MyComponent]` or `[MyService]` as the first _string_ argument (after the level, if provided) for easy identification in logs.
- **Arguments (`...args`):** Accepts any number of additional arguments (strings, numbers, booleans, objects, arrays, Errors, null, undefined). These are intelligently formatted for both console and file output.
- **Console Output:** Formatted with timestamp, level symbol/name, module tag, and colors. Objects/Errors are pretty-printed.
- **File Output:** Plain text format: `YYYY-MM-DD HH:mm:ss.SSS [LEVEL] Message content...`. Colors are stripped, objects/errors are stringified.

**`initSessionLog(): Promise<boolean>`**

Manually initializes the file logging session.

- Ensures the log directory exists (trying default and fallback locations).
- Creates or verifies the log file for the current 2-day window.
- Writes a session start marker to the file.
- Triggers log cleanup.
- Returns `true` on success, `false` on failure (errors logged internally).
- _Note:_ Called automatically on the first `log()` if not called manually, but calling it early ensures predictability.

### File Management

**`loggerInterface: LoggerInterface`**

An object providing methods to interact with log files.

- **`getLogFiles(): Promise<string[]>`:** Returns a sorted list (newest first) of available log filenames (e.g., `['session_2024-03-15.txt', ...]`).
- **`getCurrentSessionLog(): Promise<string>`:** Reads the content of the _currently active_ log file. Returns `""` on error.
- **`readLogFile(filename: string): Promise<string | null>`:** Reads the content of a specific log file. Returns `null` if not found, empty, or on error. Handles Android Base64 decoding automatically.
- **`deleteLogFile(filename: string): Promise<boolean>`:** Deletes a specific log file. **Cannot delete the active session log.** Returns `true` on success or if file didn't exist.
- **`deleteAllLogs(): Promise<boolean>`:** Deletes all log files _except_ the active one. Returns `true` if all deletions succeeded.
- **`cleanupCurrentSession(): Promise<void>`:** Resets internal session state and deletes the current log file _only if it's empty_.

_(See `types.ts` or hover in your IDE for detailed JSDoc on `LoggerInterface` methods)_

### Types

```typescript
import type { LogLevel, LoggerInterface, LoggerConfig } from 'react-native-beautiful-logs';
```

Use these imported types for strong typing when interacting with the library.

## ⚙️ Configuration (Via Constants)

**Currently, configuration is managed by editing the constants directly in the library's source files _before_ building your app.** Runtime configuration is planned for the future.

Key constants in `src/constants.ts`:

- **`LOG_FILTERS: string[]`**: Array of substrings. Logs containing any of these (case-insensitive) will be skipped entirely.
  - Example: `['[Network]', 'Password']` filters network logs and any log containing "Password".
- **`MAX_LOG_FILES: number`**: Max number of log files to keep (default: 50). Oldest are deleted first.
- **`MAX_LOG_AGE_DAYS: number`**: Max age in days for log files (default: 30). Older files are deleted.
- **`MAX_LOG_SIZE_MB: number`**: Max size in MB per log file (default: 10). Triggers rollover check on _next_ write.
- **`DEFAULT_LOG_DIR_BASE: string`**: Platform-specific default base directory (`DocumentDir` for iOS, `CacheDir` for Android).
- **`FALLBACK_DIRS: string[]`**: Directories to try if the default fails.
- **`LOGS_SUBDIR: string`**: Subdirectory name within the base dir (default: `'logs'`).
- **`SYMBOLS: Record<LogLevel, string>`**: Emojis used for log levels in console output.
- **`COLORS: Record<..., string>`**: ANSI color codes for console output styling.

## 📸 Output Previews

### Console Output Example

```console
14:05:10.345 📱 INFO  [Network] → Request successful: { status: 200, items: 42 }
14:05:11.802 🔍 DEBUG [DataStore] → Cache miss for key: user:101
14:05:12.100 ⚠️ WARN  [AuthService] → Token nearing expiration.
14:05:13.567 ❌ ERROR [PaymentFlow] → Payment processing failed:
│  Error: Insufficient funds
│    at processPayment (payment.js:152)
│    at checkout (checkout.js:88)
```

### File Output Example (`session_YYYY-MM-DD.txt`)

```text
=== New Log Session Started at 2024-03-15 14:05:09.123 ===
2024-03-15 14:05:10.345 [INFO] Request successful: { status: 200, items: 42 }
2024-03-15 14:05:11.802 [DEBUG] Cache miss for key: user:101
2024-03-15 14:05:12.100 [WARN] Token nearing expiration.
2024-03-15 14:05:13.567 [ERROR] Payment processing failed: Error: Insufficient funds
  at processPayment (payment.js:152)
  at checkout (checkout.js:88)
=== App Session Resumed at 2024-03-15 15:30:00.001 ===
2024-03-15 15:30:05.010 [INFO] App resumed from background.
```

## 🗄️ Storage Details

- 📱 **iOS Default:** `<App Sandbox>/Documents/logs/session_YYYY-MM-DD.txt` (Persistent, User Accessible via Files App, Backed Up)
- 🤖 **Android Default:** `<App Sandbox>/cache/logs/session_YYYY-MM-DD.txt` (App Specific Cache, May Be Cleared by OS/User)
- _Note:_ Fallback directories might be used if defaults fail (see `FALLBACK_DIRS` in `constants.ts`).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/rakshitbharat/react-native-beautiful-logs/issues).

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## ⭐️ Show Your Support

Give a ⭐️ if this project helped you!

## 📄 License

Distributed under the MIT License. See `LICENSE` file for more information.

MIT © [Rakshit Bharat](https://github.com/rakshitbharat)

---

<p align="center">
  Happy Logging! 🎉 Made with ❤️ for the React Native community.
</p>
