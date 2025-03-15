# React Native Beautiful Logs

A beautiful, feature-rich logging library for React Native applications with colored output, file persistence, and advanced formatting.

## Features

- 🎨 Colorful console output with ANSI colors
- 📱 Module-based logging with prefixes
- 📊 Beautiful object and array formatting
- 💾 Automatic log file persistence
- 🔄 Log rotation and cleanup
- 🎯 Log level filtering (debug, info, warn, error)
- 🌐 Platform-specific storage paths (iOS & Android)
- ⚡ Concurrent write operations support
- 🔍 Custom logging interface for file operations

## Installation

```bash
# Using npm
npm install react-native-beautiful-logs

# Using yarn
yarn add react-native-beautiful-logs

# Using bun
bun add react-native-beautiful-logs
```

### Dependencies

This package requires `react-native-blob-util` for file operations. Make sure to install and link it:

```bash
npm install react-native-blob-util
# or
yarn add react-native-blob-util
```

## Usage

### Basic Usage

```typescript
import { debug, info, warn, error, log } from 'react-native-beautiful-logs';

// Basic logging
await debug('This is a debug message');
await info('This is an info message');
await warn('This is a warning message');
await error('This is an error message');

// Module-based logging
await log('[AuthService]', 'User authenticated successfully');
await info('[ApiClient]', 'Request completed');

// Object logging
const user = {
  id: 1234,
  name: 'Jane Doe',
  email: 'jane@example.com',
  isActive: true,
};
await info('User profile:', user);

// Error logging
try {
  throw new Error('Something went wrong');
} catch (err) {
  await error('[ErrorHandler]', 'Caught exception:', err);
}
```

### Custom Configuration

```typescript
import { initLogger } from 'react-native-beautiful-logs';

const logger = initLogger({
  maxLogFiles: 50, // Maximum number of log files to keep
  maxLogSizeMB: 10, // Maximum size of each log file in MB
  logRetentionDays: 30, // Number of days to keep log files
  filters: ['[Test]'], // Array of strings to filter out from logs
  customColors: {
    // Custom ANSI colors for different elements
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m', // Green
    warn: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
    // ... more color options
  },
  customSymbols: {
    // Custom symbols for log levels
    debug: '🔍',
    info: '📱',
    warn: '⚠️',
    error: '❌',
  },
});
```

### Log File Operations

```typescript
import { getLoggerInterface } from 'react-native-beautiful-logs';

const loggerInterface = getLoggerInterface();

// Get list of log files
const logFiles = await loggerInterface.getLogFiles();

// Read current session log
const currentLog = await loggerInterface.getCurrentSessionLog();

// Read specific log file
const logContent = await loggerInterface.readLogFile('session_2024-03-14.txt');

// Delete specific log file
await loggerInterface.deleteLogFile('old_session.txt');

// Delete all logs
await loggerInterface.deleteAllLogs();

// Cleanup current session
await loggerInterface.cleanupCurrentSession();
```

## Output Examples

### Basic Log Levels

```
12:00:00 🔍 DEBUG [App] → This is a debug message
12:00:01 📱 INFO  [App] → This is an info message
12:00:02 ⚠️ WARN  [App] → This is a warning message
12:00:03 ❌ ERROR [App] → This is an error message
```

### Object Logging

```
12:00:04 📱 INFO  [App] → User profile:
│  {
│    "id": 1234,
│    "name": "Jane Doe",
│    "email": "jane@example.com",
│    "isActive": true,
│    "loginCount": 42
│  }
```

## Storage Location

- iOS: `<DocumentDir>/logs/`
- Android: `<CacheDir>/logs/`

## Log File Format

Log files are named using the format `session_YYYY-MM-DD.txt` and are automatically rotated based on size and date.

## API Reference

### Main Functions

- `debug(...args: any[]): Promise<void>` - Log debug level messages
- `info(...args: any[]): Promise<void>` - Log info level messages
- `warn(...args: any[]): Promise<void>` - Log warning level messages
- `error(...args: any[]): Promise<void>` - Log error level messages
- `log(level: string | any, ...args: any[]): Promise<void>` - Generic logging function
- `initLogger(config: LoggerConfig): Logger` - Initialize logger with custom configuration
- `getLoggerInterface(): LoggerInterface` - Get interface for log file operations

### Configuration Options

```typescript
interface LoggerConfig {
  maxLogFiles?: number;
  maxLogSizeMB?: number;
  logRetentionDays?: number;
  filters?: string[];
  customColors?: typeof COLORS;
  customSymbols?: typeof DEFAULT_SYMBOLS;
}
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
