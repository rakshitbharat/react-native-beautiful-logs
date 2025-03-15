# React Native Beautiful Logs 🌈

<div align="center">
  <img src="https://img.shields.io/npm/v/react-native-beautiful-logs" alt="npm version" />
  <img src="https://img.shields.io/npm/dt/react-native-beautiful-logs" alt="downloads" />
  <img src="https://img.shields.io/github/license/rakshitbharat/react-native-beautiful-log" alt="license" />
  <img src="https://img.shields.io/github/issues/rakshitbharat/react-native-beautiful-log" alt="issues" />
  <img src="https://img.shields.io/github/stars/rakshitbharat/react-native-beautiful-log" alt="stars" />
</div>

<p align="center">
  <strong>A stunning, feature-rich logging library for React Native applications 📱✨</strong>
</p>

<p align="center">
  Beautiful console output • File persistence • Advanced formatting • Customizable themes
</p>

<hr />

## ✨ Features

- 🎨 **Stunning Console Output** - ANSI colors that make your logs pop
- 📱 **Module-based Logging** - Clean, organized logs with prefixes
- 📊 **Smart Formatting** - Beautiful object and array presentation
- 💾 **Persistent Storage** - Automatic log file management
- 🔄 **Advanced Features**
  - Log rotation and cleanup
  - Multiple log levels (debug, info, warn, error)
  - Platform-specific storage paths
  - Concurrent write operations
  - Custom logging interface

## 🚀 Quick Start

### Installation

```bash
# Using npm
npm install react-native-beautiful-logs

# Using yarn
yarn add react-native-beautiful-logs

# Using bun
bun add react-native-beautiful-logs
```

### Required Dependencies

Install the following dependency for file operations:

```bash
npm install react-native-blob-util
# or
yarn add react-native-blob-util
```

## 💡 Usage

### Basic Example

```typescript
import { debug, info, warn, error } from 'react-native-beautiful-logs';

// Simple logging
await info('User logged in successfully');
await warn('API rate limit reached');
await error('Connection failed');

// With context
await info('[Auth]', { userId: 123, role: 'admin' });
```

### 🎨 Custom Configuration

```typescript
import { initLogger } from 'react-native-beautiful-logs';

const logger = initLogger({
  maxLogFiles: 50,
  maxLogSizeMB: 10,
  logRetentionDays: 30,
  customSymbols: {
    debug: '🔍',
    info: '📱',
    warn: '⚠️',
    error: '❌',
  },
});
```

## 📸 Output Preview

### Console Output

```
12:00:00 📱 INFO  [Auth] → User logged in successfully
12:00:01 ⚠️ WARN  [API] → Rate limit: 98/100 requests
12:00:02 ❌ ERROR [Network] → Connection timeout
```

### Object Output

```
12:00:03 📱 INFO [User] → Profile updated:
│  {
│    "name": "Jane Doe",
│    "email": "jane@example.com",
│    "preferences": {
│      "theme": "dark",
│      "notifications": true
│    }
│  }
```

## 📖 Documentation

### Log Levels

| Level | Symbol | Use Case                |
| ----- | ------ | ----------------------- |
| DEBUG | 🔍     | Development information |
| INFO  | 📱     | General information     |
| WARN  | ⚠️     | Warning messages        |
| ERROR | ❌     | Error conditions        |

### API Methods

```typescript
// Core Methods
debug(...args: any[]): Promise<void>
info(...args: any[]): Promise<void>
warn(...args: any[]): Promise<void>
error(...args: any[]): Promise<void>
log(level: string, ...args: any[]): Promise<void>

// Configuration
initLogger(config: LoggerConfig): Logger
getLoggerInterface(): LoggerInterface
```

### Storage Details

- 📱 **iOS**: `<DocumentDir>/logs/`
- 🤖 **Android**: `<CacheDir>/logs/`

Files are named: `session_YYYY-MM-DD.txt`

## 🛠️ Advanced Usage

### File Operations

```typescript
const loggerInterface = getLoggerInterface();

// File Management
await loggerInterface.getLogFiles();
await loggerInterface.getCurrentSessionLog();
await loggerInterface.readLogFile('session_2024-03-14.txt');
```

### Configuration Options

```typescript
interface LoggerConfig {
  maxLogFiles?: number; // Maximum log files to keep
  maxLogSizeMB?: number; // Max size per file
  logRetentionDays?: number; // Days to keep logs
  filters?: string[]; // Log filtering
  customColors?: ColorConfig;
  customSymbols?: SymbolConfig;
}
```

## ⭐️ Support

If you find this project helpful, please consider:

- Giving it a star on [GitHub](https://github.com/rakshitbharat/react-native-beautiful-log)
- Sharing it with others
- Contributing to its development

## 📄 License

MIT © [Rakshit Bharat](https://github.com/rakshitbharat)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

<p align="center">
  Made with ❤️ for the React Native community
</p>
