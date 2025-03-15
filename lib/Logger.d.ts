import { LoggerConfig as LogConfig, LogLevel } from './types';
export declare class Logger {
    private static instance;
    private config;
    private sessionFile;
    private initialized;
    private initializationError;
    private writeQueue;
    private oldLogFiles;
    private constructor();
    static getInstance(config?: Partial<LogConfig>): Logger;
    private getLogsDirectory;
    private initializeSession;
    private cleanupOldLogs;
    private writeToFile;
    private rotateLogFile;
    private shouldLog;
    log(level: LogLevel | string, ...messages: unknown[]): Promise<void>;
    loggerInterface: {
        getLogFiles: () => Promise<string[]>;
        getCurrentSessionLog: () => Promise<string>;
        readLogFile: (filename: string) => Promise<string | null>;
        deleteLogFile: (filename: string) => Promise<boolean>;
        deleteAllLogs: () => Promise<boolean>;
        cleanupCurrentSession: () => Promise<void>;
    };
}
