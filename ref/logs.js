import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import moment from 'moment';

// Keep the LOG_FILTERS array from the original file
export const LOG_FILTERS = [
  // `[Axios]`,
  // `[Box3IconGrid]`,
  // `[CarProfileService]`,
  // `[VehicleService]`,
  // `[PurchaseService]`,
  // `[VINDataManager]`,
  // `[VINCommand]`,
  // `[BleManager]`,
  // `[APIConfig]`,
  // `[ServiceInitializer]`,
  // `[CacheManager]`,
  // `[ECUDecoder]`,
  // `[ObdCommandHandler]`,
  // `[IconWrapper]`,
  // `[RegularUtils]`,
  // `[FaultCodeProcessor]`,
  // `[BackHandlerService]`,
  // `[VINProfileManager]`,
  // `[PaymentService]`,
  // `[FastConnectProvider]`,
  // `[LoggingService]`,
  // `[ReportService]`,
  // `[FaultCodeManager]`,
  // `[TroubleCodeProcessor]`,
  // `[ProtocolServiceBased]`,
  // `[obdLiveDataSlice]`,
  // `[ObdDataManager]`,
  // `[ECUDataRetriever]`,
  // `[TaskQueue]`,
  // `[BleManagerWrapper]`,
  // `[OBDMonitor]`,
  // `[FaultCode]`,
  // `[BluetoothContext]`,
  // `[BackgroundTaskManager]`,
  // `[BluetoothStateManagerWrapper]`,
  // `[navigationHelpers]`,
  // `[regular]`,
  // `[TaskQueueManager]`,
  // `[ECUConnector]`,
  // `[OBDService]`,
  // `[TroubleCodeBaseClass]`,
  // `[DTCClearRetriever]`,
  // `[VINRetriever]`,
  // `[BaseDTCRetriever]`,
  // `[DTCBaseDecoder]`,
  // `[useManageBluetooth]`,
  // `[useOBDDevice]`,
  // `[useOBDDeviceData]`,
  // `[useSafeNavigation]`,
  // `[useSessionStorage]`,
  // `[useStripePayment]`,
  // `[useUserConfiguration]`,
  // `[useReport]`,
  // `[useVehicleHierarchy]`,
  // `[CarProfileListResponsive]`,
  // `[DownloadReportsResponsive]`,
  // `[FaultCodeResponsive]`,
  // `[ForgotPasswordResponsive]`,
  // `[LoginResponsive]`,
  // `[MainScreenWithTiles]`,
  // `[RegisterResponsive]`,
  // `[UserProfileResponsive]`,
  // `[loggingService]`,
  // `[logs]`,
  // `[reportService]`,
  // `[carProfilesSlice]`,
  // `[liveSystemSlice]`,
  // `[purchaseReportSlice]`,
  // `[storageSlice]`,
  // `[vehicleHierarchySlice]`,
  // `[vinDataSlice]`,
  // `[ObdDataProcessor]`,
  // `[cacheUtils]`,
  // `[Conversions]`,
  // `[faultCodeParser]`,
  // `[faultCodeUtils]`,
  // `[sorting]`,
  // `[uuidUtils]`,
  // `[ReactOBD2JavaScript]`,
  // `[OBDUtils]`,
  // `[ClearFaultCode]`,
  // `[VehicleLiveDataRetriever]`,
  // `[PERMANENT_DTC]`,
  // `[CURRENT_DTC]`,
  // `[PENDING_DTC]`,
];

// ANSI color codes for terminal output (keep the original colors)
const COLORS = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m', // Green
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  timestamp: '\x1b[90m', // Gray
  reset: '\x1b[0m', // Reset
  dim: '\x1b[2m', // Dimmed text
  bright: '\x1b[1m', // Bright/Bold text
  bgBlack: '\x1b[40m', // Black background
  jsonKey: '\x1b[34m', // Blue
  jsonString: '\x1b[32m', // Green
  jsonNumber: '\x1b[33m', // Yellow
  jsonBoolean: '\x1b[35m', // Magenta
  jsonNull: '\x1b[90m', // Gray
};

const SYMBOLS = {
  debug: '🔍',
  info: '📱',
  warn: '⚠️',
  error: '❌',
};

let isSessionInitialized = false;
let LOG_DIR = Platform.select({
  ios: `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/logs`,
  android: `${ReactNativeBlobUtil.fs.dirs.CacheDir}/logs`,
});
let currentSessionLogPath = null;

// Maximum number of log files to keep
const MAX_LOG_FILES = 50;
const MAX_LOG_SIZE_MB = 10; // Maximum size per log file in MB

const FALLBACK_DIRS = Platform.select({
  android: [
    ReactNativeBlobUtil.fs.dirs.CacheDir,
    ReactNativeBlobUtil.fs.dirs.DocumentDir,
    ReactNativeBlobUtil.fs.dirs.MainBundleDir,
  ],
  ios: [ReactNativeBlobUtil.fs.dirs.DocumentDir, ReactNativeBlobUtil.fs.dirs.CacheDir],
});

const tryCreateDirectory = async baseDir => {
  try {
    const logsPath = `${baseDir}/logs`;
    const exists = await ReactNativeBlobUtil.fs.exists(logsPath);
    if (!exists) {
      await ReactNativeBlobUtil.fs.mkdir(logsPath);
      // Verify write access with test file
      const testPath = `${logsPath}/test.txt`;
      await ReactNativeBlobUtil.fs.writeFile(testPath, 'test', 'utf8');
      await ReactNativeBlobUtil.fs.unlink(testPath);
    }
    return logsPath;
  } catch (error) {
    console.warn(`Failed to create directory in ${baseDir}:`, error);
    return null;
  }
};

// Add a lock to prevent multiple simultaneous initializations
let initializationInProgress = false;

// Get the base date for logging (will be same for today and tomorrow)
const getBaseLogDate = () => {
  const today = moment();
  // If it's an odd-numbered day, use today's date
  // If it's an even-numbered day, use yesterday's date
  const dayOfMonth = today.date();
  return dayOfMonth % 2 === 0 ? today.subtract(1, 'day') : today;
};

// Generate the log filename for the current 2-day window
const generateLogFilename = () => {
  const baseDate = getBaseLogDate();
  return `session_${baseDate.format('YYYY-MM-DD')}.txt`;
};

// Initialize session log file - will reuse existing file if within same 2-day window
const initSessionLog = async () => {
  // If already initialized with a valid file, verify it's still in the current window
  if (isSessionInitialized && currentSessionLogPath) {
    const exists = await ReactNativeBlobUtil.fs.exists(currentSessionLogPath);
    if (exists) {
      const currentFileName = currentSessionLogPath.split('/').pop();
      const expectedFileName = generateLogFilename();
      if (currentFileName === expectedFileName) {
        return true;
      }
    }
    // Reset if file doesn't exist or outside current window
    isSessionInitialized = false;
    currentSessionLogPath = null;
  }

  // Prevent multiple simultaneous initializations
  if (initializationInProgress) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (isSessionInitialized && currentSessionLogPath) {
      return true;
    }
  }

  initializationInProgress = true;

  try {
    for (const baseDir of FALLBACK_DIRS) {
      try {
        const logsPath = await tryCreateDirectory(baseDir);
        if (!logsPath) continue;

        const fileName = generateLogFilename();
        const filePath = `${logsPath}/${fileName}`;

        // Check if file already exists
        const exists = await ReactNativeBlobUtil.fs.exists(filePath);
        if (!exists) {
          // Create new file if it doesn't exist
          await ReactNativeBlobUtil.fs.writeFile(filePath, '', 'utf8');
        }

        const fileExists = await ReactNativeBlobUtil.fs.exists(filePath);
        if (fileExists) {
          // Success - update global variables
          LOG_DIR = logsPath;
          currentSessionLogPath = filePath;
          isSessionInitialized = true;

          if (!exists) {
            // Only write session start marker for new files
            const timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
            const sessionStartMessage = `=== Session Started at ${timestamp} ===\n`;
            await ReactNativeBlobUtil.fs.appendFile(filePath, sessionStartMessage, 'utf8');
          } else {
            // For existing files, just add a session separator
            const timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
            const sessionSeparator = `\n=== New Session Started at ${timestamp} ===\n`;
            await ReactNativeBlobUtil.fs.appendFile(filePath, sessionSeparator, 'utf8');
          }

          await cleanupOldLogs();
          console.log(`[Logger] Using log file: ${fileName}`);
          return true;
        }
      } catch (error) {
        console.warn(`Failed to initialize in ${baseDir}:`, JSON.stringify(error, null, 2));
        continue;
      }
    }

    console.error('All storage locations failed for session initialization');
    return false;
  } finally {
    initializationInProgress = false;
  }
};

// Initialize directory and session file
initSessionLog();

// Cleanup old log files
const cleanupOldLogs = async () => {
  try {
    const files = await loggerInterface.getLogFiles();

    // Sort files by date (newest first)
    const sortedFiles = files.sort((a, b) => {
      const dateA = a.match(/session_(\d{4}-\d{2}-\d{2})/)?.[1] || '';
      const dateB = b.match(/session_(\d{4}-\d{2}-\d{2})/)?.[1] || '';
      return dateB.localeCompare(dateA);
    });

    // Keep only the most recent MAX_LOG_FILES files
    if (sortedFiles.length > MAX_LOG_FILES) {
      const filesToDelete = sortedFiles.slice(MAX_LOG_FILES);
      await Promise.all(filesToDelete.map(file => loggerInterface.deleteLogFile(file)));
    }

    // Check file sizes and age
    const currentFileName = generateLogFilename();
    const today = moment();

    for (const file of sortedFiles) {
      // Don't delete current window's log file
      if (file === currentFileName) continue;

      const filePath = `${LOG_DIR}/${file}`;
      const stats = await ReactNativeBlobUtil.fs.stat(filePath);

      // Check file size
      const sizeMB = stats.size / (1024 * 1024);

      // Parse date from filename
      const dateMatch = file.match(/session_(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const fileDate = moment(dateMatch[1]);
        const daysOld = today.diff(fileDate, 'days');

        // Delete if file is too big or too old (older than 30 days)
        if (sizeMB > MAX_LOG_SIZE_MB || daysOld > 30) {
          await loggerInterface.deleteLogFile(file);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up logs:', error);
  }
};

// Write log entry to file with proper encoding
const writeToFile = async (message, type) => {
  // Ensure we have an initialized session
  if (!isSessionInitialized || !currentSessionLogPath) {
    const initialized = await initSessionLog();
    if (!initialized) {
      console.error('Failed to initialize logging session');
      return;
    }
  }

  try {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
    const logEntry = `${timestamp} [${type.toUpperCase()}] ${message}\n`;

    // Verify file exists before writing
    const exists = await ReactNativeBlobUtil.fs.exists(currentSessionLogPath);
    if (!exists) {
      // Session file was deleted, try to reinitialize once
      isSessionInitialized = false;
      const reinitialized = await initSessionLog();
      if (!reinitialized) return;
    }

    // Use a try-catch block for the actual write operation
    try {
      if (Platform.OS === 'android') {
        try {
          await ReactNativeBlobUtil.fs.appendFile(currentSessionLogPath, logEntry, 'utf8');
        } catch (writeError) {
          // Fallback to base64 if UTF-8 fails
          const base64Data = Buffer.from(logEntry).toString('base64');
          await ReactNativeBlobUtil.fs.appendFile(currentSessionLogPath, base64Data, 'base64');
        }
      } else {
        await ReactNativeBlobUtil.fs.appendFile(currentSessionLogPath, logEntry, 'utf8');
      }

      // Check if current log file has exceeded size limit
      const stats = await ReactNativeBlobUtil.fs.stat(currentSessionLogPath);
      if (stats && stats.size / (1024 * 1024) > MAX_LOG_SIZE_MB) {
        // Start a new session file when size limit is reached
        isSessionInitialized = false;
        await initSessionLog();
      }
    } catch (writeError) {
      console.error('Failed to write to log file:', writeError);
      // Don't try to reinitialize here - just report the error
    }
  } catch (error) {
    console.error('Error in writeToFile:', error);
  }
};

// Restore the original formatJSON function
const formatJSON = obj => {
  const jsonString = JSON.stringify(obj, null, 2);
  return jsonString.replace(/(".*?":|".*?"|\d+\.?\d*|true|false|null)/g, match => {
    if (match.endsWith(':')) {
      // Key
      return `${COLORS.jsonKey}${match}${COLORS.reset}`;
    } else if (match.startsWith('"')) {
      // String
      return `${COLORS.jsonString}${match}${COLORS.reset}`;
    } else if (/^-?\d+\.?\d*$/.test(match)) {
      // Number
      return `${COLORS.jsonNumber}${match}${COLORS.reset}`;
    } else if (match === 'true' || match === 'false') {
      // Boolean
      return `${COLORS.jsonBoolean}${match}${COLORS.reset}`;
    } else if (match === 'null') {
      // Null
      return `${COLORS.jsonNull}${match}${COLORS.reset}`;
    }
    return match;
  });
};

// Keep the original formatMessage function
const formatMessage = (type, messageParts) => {
  const timestamp = new Date().toLocaleTimeString();
  const typeUpper = type.toUpperCase().padEnd(5);
  const moduleMatch = messageParts[0]?.match(/\[(.*?)\]/);
  const moduleName = moduleMatch ? moduleMatch[1] : 'App';

  const coloredTimestamp = `${COLORS.timestamp}${timestamp}${COLORS.reset}`;
  const coloredType = `${COLORS[type]}${COLORS.bright}${SYMBOLS[type]} ${typeUpper}${COLORS.reset}`;
  const coloredModule = `${COLORS[type]}${COLORS.bright}${moduleName}${COLORS.reset}`;
  const header = `${coloredTimestamp} ${coloredType} ${COLORS.dim}[${coloredModule}]${COLORS.reset} →`;

  const formattedParts = messageParts.map(p => {
    if (p === null) return 'null';
    if (p === undefined) return 'undefined';

    if (typeof p === 'object') {
      try {
        // Try to handle stringified JSON first
        const potentialJson = p.toString();
        if (potentialJson.startsWith('{') || potentialJson.startsWith('[')) {
          try {
            const parsed = JSON.parse(potentialJson);
            return (
              '\n' +
              formatJSON(parsed)
                .split('\n')
                .map(line => `${COLORS[type]}│${COLORS.reset}  ${line}`)
                .join('\n')
            );
          } catch {
            // If parsing fails, treat as regular object
          }
        }

        // Handle regular objects
        const formatted = formatJSON(p);
        return (
          '\n' +
          formatted
            .split('\n')
            .map(line => `${COLORS[type]}│${COLORS.reset}  ${line}`)
            .join('\n')
        );
      } catch (err) {
        return p.toString();
      }
    }
    return String(p);
  });

  return [header, ...formattedParts].join(' ');
};

export const log = (...args) => {
  // Check if any argument matches our filter patterns
  const shouldFilter = args.some(
    arg =>
      typeof arg === 'string' &&
      LOG_FILTERS.some(filter => arg.toLowerCase().includes(filter.toLowerCase())),
  );

  if (shouldFilter) return;

  // If no arguments, just log empty call
  if (!args.length) {
    return;
  }

  const validTypes = ['debug', 'error', 'warn', 'info'];
  const [firstArg, ...rest] = args;
  const type = validTypes.includes(firstArg?.toLowerCase()) ? firstArg.toLowerCase() : 'info';
  const messageParts = validTypes.includes(firstArg?.toLowerCase()) ? rest : args;

  try {
    const formattedMessage = formatMessage(type, messageParts);

    // Log to console with proper formatting
    switch (type.toLowerCase()) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }

    // Log to file without color codes
    const cleanMessage = formattedMessage.replace(/\u001b\[\d+m/g, '');
    writeToFile(cleanMessage, type);
  } catch (error) {
    console.error('📴 Logging Error:', error);
  }
};

// Platform-specific loggerInterface with enhanced handling
export const loggerInterface = {
  async getLogFiles() {
    try {
      // Ensure logs directory exists
      const exists = await ReactNativeBlobUtil.fs.exists(LOG_DIR);
      if (!exists) {
        await ReactNativeBlobUtil.fs.mkdir(LOG_DIR);
        return [];
      }

      const files = await ReactNativeBlobUtil.fs.ls(LOG_DIR);

      // Filter out empty files and verify each file
      const validFiles = [];
      for (const file of files) {
        if (!file.endsWith('.txt')) continue;

        const filePath = `${LOG_DIR}/${file}`;
        try {
          const stats = await ReactNativeBlobUtil.fs.stat(filePath);
          if (stats && stats.size > 0) {
            validFiles.push(file);
          } else {
            console.warn(`Skipping empty file: ${file}`);
            // Clean up empty files
            await this.deleteLogFile(file);
          }
        } catch (statError) {
          console.error(`Error checking file ${file}:`, JSON.stringify(statError, null, 2));
        }
      }

      return validFiles.sort((a, b) => b.localeCompare(a));
    } catch (error) {
      console.error('Error getting log files:', JSON.stringify(error, null, 2));
      return [];
    }
  },

  async getCurrentSessionLog() {
    if (!currentSessionLogPath) return '';
    try {
      return await ReactNativeBlobUtil.fs.readFile(currentSessionLogPath, 'utf8');
    } catch (error) {
      console.error('Error reading current session log:', error);
      return '';
    }
  },

  async readLogFile(filename) {
    try {
      const filePath = `${LOG_DIR}/${filename}`;

      // Verify file exists and has content
      const exists = await ReactNativeBlobUtil.fs.exists(filePath);
      if (!exists) {
        console.error('File does not exist:', filePath);
        return null;
      }

      const stats = await ReactNativeBlobUtil.fs.stat(filePath);
      if (!stats || stats.size === 0) {
        console.error('File is empty:', filePath);
        // Clean up empty file
        await this.deleteLogFile(filename);
        return null;
      }

      // Read file with appropriate encoding per platform
      if (Platform.OS === 'android') {
        try {
          const content = await ReactNativeBlobUtil.fs.readFile(filePath, 'utf8');
          if (!content || content.trim() === '') {
            throw new Error('Empty content from utf8 read');
          }
          return content;
        } catch (readError) {
          console.warn('UTF-8 read failed, trying base64:', JSON.stringify(readError, null, 2));

          // Fallback to base64 reading
          const base64Content = await ReactNativeBlobUtil.fs.readFile(filePath, 'base64');
          if (!base64Content) {
            throw new Error('Empty content from base64 read');
          }

          const decodedContent = Buffer.from(base64Content, 'base64').toString('utf8');
          if (!decodedContent || decodedContent.trim() === '') {
            throw new Error('Empty content after base64 decode');
          }
          return decodedContent;
        }
      } else {
        const content = await ReactNativeBlobUtil.fs.readFile(filePath, 'utf8');
        if (!content || content.trim() === '') {
          console.error('File is empty (after read):', filePath);
          return null;
        }
        return content;
      }
    } catch (error) {
      console.error('Error reading log file:', filename, JSON.stringify(error, null, 2));
      return null;
    }
  },

  async deleteLogFile(filename) {
    try {
      const filePath = `${LOG_DIR}/${filename}`;
      if (filePath === currentSessionLogPath) {
        return false; // Don't delete current session log
      }
      await ReactNativeBlobUtil.fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting log file:', error);
      return false;
    }
  },

  async deleteAllLogs() {
    try {
      const exists = await ReactNativeBlobUtil.fs.exists(LOG_DIR);
      if (!exists) return true;
      const files = await this.getLogFiles();
      await Promise.all(
        files
          .filter(file => `${LOG_DIR}/${file}` !== currentSessionLogPath)
          .map(file => this.deleteLogFile(file)),
      );
      return true;
    } catch (error) {
      console.error('Error deleting all logs:', error);
      return false;
    }
  },

  async cleanupCurrentSession() {
    if (currentSessionLogPath) {
      const stats = await ReactNativeBlobUtil.fs.stat(currentSessionLogPath);
      const sizeMB = stats.size / (1024 * 1024);
      if (sizeMB === 0) {
        await this.deleteLogFile(currentSessionLogPath.split('/').pop());
      }
      currentSessionLogPath = null;
      isSessionInitialized = false;
    }
  },
};
