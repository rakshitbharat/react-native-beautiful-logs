import { LoggerConfig, LogLevel } from './types.js';
import { COLORS } from './constants.js';
type ColorMap = {
    [K in keyof typeof COLORS]: string;
};
export declare const formatJSON: (obj: unknown, colors?: ColorMap) => string;
export declare const formatMessage: (type: LogLevel, messageParts: unknown[], config: Required<LoggerConfig>) => string;
export declare const getDateString: (date?: Date) => string;
export {};
