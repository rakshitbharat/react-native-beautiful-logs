export declare const COLORS: {
    debug: string;
    info: string;
    warn: string;
    error: string;
    timestamp: string;
    reset: string;
    dim: string;
    bright: string;
    bgBlack: string;
    jsonKey: string;
    jsonString: string;
    jsonNumber: string;
    jsonBoolean: string;
    jsonNull: string;
};
export declare const DEFAULT_SYMBOLS: {
    debug: string;
    info: string;
    warn: string;
    error: string;
};
export declare const MAX_LOG_FILES = 50;
export declare const MAX_LOG_SIZE_MB = 10;
export declare const LOG_RETENTION_DAYS = 30;
export declare const LOG_DIR: string | undefined;
export declare const FALLBACK_DIRS: string[] | undefined;
export declare const DEFAULT_CONFIG: {
    maxLogFiles: number;
    maxLogSizeMB: number;
    logRetentionDays: number;
    filters: string[];
    customColors: {
        debug: string;
        info: string;
        warn: string;
        error: string;
        timestamp: string;
        reset: string;
        dim: string;
        bright: string;
        bgBlack: string;
        jsonKey: string;
        jsonString: string;
        jsonNumber: string;
        jsonBoolean: string;
        jsonNull: string;
    };
    customSymbols: {
        debug: string;
        info: string;
        warn: string;
        error: string;
    };
};
