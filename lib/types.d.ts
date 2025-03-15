export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LoggerConfig {
    maxLogFiles?: number;
    maxLogSizeMB?: number;
    logRetentionDays?: number;
    filters?: string[];
    customColors?: {
        [key: string]: string;
    };
    customSymbols?: {
        [key in LogLevel]?: string;
    };
}
export interface LoggerInterface {
    getLogFiles(): Promise<string[]>;
    getCurrentSessionLog(): Promise<string>;
    readLogFile(filename: string): Promise<string | null>;
    deleteLogFile(filename: string): Promise<boolean>;
    deleteAllLogs(): Promise<boolean>;
    cleanupCurrentSession(): Promise<void>;
}
