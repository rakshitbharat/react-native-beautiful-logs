import { LoggerConfig, LogLevel } from './types.js';
import { COLORS } from './constants.js';

type ColorMap = {
  [K in keyof typeof COLORS]: string;
};

export const formatJSON = (obj: unknown, colors: ColorMap = COLORS): string => {
  const jsonString = JSON.stringify(obj, null, 2);
  return jsonString.replace(/(".*?":|".*?"|\d+\.?\d*|true|false|null)/g, match => {
    if (match.endsWith(':')) {
      // Key
      return `${colors.jsonKey}${match}${colors.reset}`;
    } else if (match.startsWith('"')) {
      // String
      return `${colors.jsonString}${match}${colors.reset}`;
    } else if (/^-?\d+\.?\d*$/.test(match)) {
      // Number
      return `${colors.jsonNumber}${match}${colors.reset}`;
    } else if (match === 'true' || match === 'false') {
      // Boolean
      return `${colors.jsonBoolean}${match}${colors.reset}`;
    } else if (match === 'null') {
      // Null
      return `${colors.jsonNull}${match}${colors.reset}`;
    }
    return match;
  });
};

export const formatMessage = (
  type: LogLevel,
  messageParts: unknown[],
  config: Required<LoggerConfig>,
): string => {
  const timestamp = new Date().toLocaleTimeString();
  const typeUpper = type.toUpperCase().padEnd(5);
  const firstPart = messageParts[0];
  const moduleMatch = typeof firstPart === 'string' ? firstPart.match(/\[(.*?)\]/) : null;
  const moduleName = moduleMatch ? moduleMatch[1] : 'App';

  const colors = config.customColors;
  const symbols = config.customSymbols;

  const coloredTimestamp = `${colors.timestamp}${timestamp}${colors.reset}`;
  const coloredType = `${colors[type]}${colors.bright}${symbols[type] || ''} ${typeUpper}${colors.reset}`;
  const coloredModule = `${colors[type]}${colors.bright}${moduleName}${colors.reset}`;
  const header = `${coloredTimestamp} ${coloredType} ${colors.dim}[${coloredModule}]${colors.reset} →`;

  const formattedParts = messageParts.map(p => {
    if (p === null) return 'null';
    if (p === undefined) return 'undefined';

    if (typeof p === 'object') {
      try {
        // Handle stringified JSON
        const potentialJson = String(p);
        if (potentialJson.startsWith('{') || potentialJson.startsWith('[')) {
          try {
            const parsed = JSON.parse(potentialJson);
            return (
              '\n' +
              formatJSON(parsed, colors as ColorMap)
                .split('\n')
                .map(line => `${colors[type]}│${colors.reset}  ${line}`)
                .join('\n')
            );
          } catch {
            // If parsing fails, treat as regular object
          }
        }

        // Handle regular objects
        const formatted = formatJSON(p, colors as ColorMap);
        return (
          '\n' +
          formatted
            .split('\n')
            .map(line => `${colors[type]}│${colors.reset}  ${line}`)
            .join('\n')
        );
      } catch (err) {
        return String(p);
      }
    }
    return String(p);
  });

  return [header, ...formattedParts].join(' ');
};

export const getDateString = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};
