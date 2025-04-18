# React Native Beautiful Logs - Technical Documentation

## Overview

`logs.js` is a comprehensive logging utility for React Native applications that provides advanced logging capabilities with both console and file-based output. The module features colored terminal output, persistent file storage, log rotation, and robust error handling across both iOS and Android platforms.

## Core Features

### 1. Multi-Level Logging

- Supports various log levels: `debug`, `info`, `warn`, and `error`
- Each level has distinct visual styling with colors and emoji indicators
- Automatically formats complex data structures including nested JSON objects

### 2. File-Based Log Persistence

- Automatically writes all logs to timestamped files in device storage
- Implements a 2-day window rotation strategy for log files
- Handles file encoding issues across platforms with fallback mechanisms

### 3. Robust Storage Management

- Multiple fallback directories if primary storage location fails
- Automatic log rotation when files exceed size limits (10MB)
- Limits total log files to 50 to prevent excessive storage consumption
- Auto-cleanup of logs older than 30 days

### 4. Log Filtering

- Configurable `LOG_FILTERS` array to exclude logs from specific modules
- Filters operate on string pattern matching

## Architecture

### Storage Strategy

The module implements a hierarchical storage approach:

- Primary storage locations are platform-dependent:
  - iOS: DocumentDir/logs
  - Android: CacheDir/logs
- If primary locations fail, the system tries multiple fallback directories
- Each log file represents a 2-day window, using odd/even day logic

### Log Session Management

- Sessions are tracked with timestamped headers
- New sessions append to existing files if within the same 2-day window
- Session initialization includes directory validation and write permission testing

### Error Handling

- Comprehensive error handling for file system operations
- Base64 fallback encoding for Android UTF-8 issues
- Verification steps before and after write operations

## API Reference

### Main Logging Function

```javascript
log(level, ...messageParts);
```

- `level` (optional): 'debug', 'info', 'warn', or 'error'
- `...messageParts`: Any number of arguments to log (strings, objects, etc.)

### Logger Interface

```javascript
loggerInterface.getLogFiles(); // Returns array of log filenames
loggerInterface.getCurrentSessionLog(); // Returns content of current log file
loggerInterface.readLogFile(filename); // Reads specific log file
loggerInterface.deleteLogFile(filename); // Deletes specific log file
loggerInterface.deleteAllLogs(); // Deletes all except current log
loggerInterface.cleanupCurrentSession(); // Closes and cleans current session
```

## Implementation Details

### Log File Naming

Files follow the pattern `session_YYYY-MM-DD.txt` where the date represents the start of a 2-day window.

### Log Entry Format

Each log entry follows the format:

```
YYYY-MM-DD HH:mm:ss.SSS [LEVEL] [ModuleName] message
```

### Console Output Formatting

The console output includes:

- Timestamp in gray
- Level indicator with emoji and color (🔍 for debug, 📱 for info, ⚠️ for warn, ❌ for error)
- Module name extracted from message
- Color-coded JSON formatting for object arguments

## Usage Example

```javascript
import { log } from './logs';

// Simple logging
log('info', '[MyComponent]', 'Application started');

// Object logging with automatic formatting
log('debug', '[DataService]', { userId: 123, settings: { theme: 'dark' } });

// Error logging
try {
  // Some code that might throw
} catch (error) {
  log('error', '[ErrorHandler]', 'Failed to process data', error);
}
```

This implementation provides a powerful, reliable logging system that enhances debugging capabilities while ensuring logs are properly managed and stored for later analysis.
