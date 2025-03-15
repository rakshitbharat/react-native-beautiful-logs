import { Logger } from './Logger';
import type { LogLevel, LoggerConfig, LoggerInterface } from './types';
import * as utils from './utils';
export declare const debug: (...args: unknown[]) => Promise<void>;
export declare const info: (...args: unknown[]) => Promise<void>;
export declare const warn: (...args: unknown[]) => Promise<void>;
export declare const error: (...args: unknown[]) => Promise<void>;
export declare const log: (level: LogLevel | string, ...args: unknown[]) => Promise<void>;
export declare const initLogger: (config: LoggerConfig) => Logger;
export declare const getLoggerInterface: () => LoggerInterface;
export { Logger, utils };
export type { LogLevel, LoggerConfig, LoggerInterface };
