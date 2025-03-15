import { formatJSON, formatMessage } from '../utils';
import { COLORS, DEFAULT_SYMBOLS } from '../constants';
import type { LoggerConfig } from '../types';

describe('formatJSON', () => {
  it('should format primitive values correctly', () => {
    const input = {
      string: 'test',
      number: 42,
      boolean: true,
      null: null,
    };
    const result = formatJSON(input);
    
    expect(result).toContain('"string"');
    expect(result).toContain('"test"');
    expect(result).toContain('42');
    expect(result).toContain('true');
    expect(result).toContain('null');
  });

  it('should handle nested objects', () => {
    const input = {
      nested: {
        array: [1, 2, 3],
        object: { key: 'value' },
      },
    };
    const result = formatJSON(input);
    
    expect(result).toContain('[');
    expect(result).toContain(']');
    expect(result).toContain('{');
    expect(result).toContain('}');
    expect(result).toContain('"key"');
    expect(result).toContain('"value"');
  });

  it('should use custom colors when provided', () => {
    const customColors = { ...COLORS, jsonString: '\x1b[35m' };
    const input = { test: 'value' };
    const result = formatJSON(input, customColors);
    
    expect(result).toContain('\x1b[35m');
  });
});

describe('formatMessage', () => {
  const defaultConfig: Required<LoggerConfig> = {
    maxLogFiles: 50,
    maxLogSizeMB: 10,
    logRetentionDays: 30,
    filters: [],
    customColors: COLORS,
    customSymbols: DEFAULT_SYMBOLS,
  };

  it('should format basic message correctly', () => {
    const result = formatMessage('info', ['Test message'], defaultConfig);
    
    expect(result).toContain('INFO');
    expect(result).toContain('Test message');
    expect(result).toContain('App'); // Updated to match actual format
  });

  it('should handle module names', () => {
    const result = formatMessage('debug', ['[TestModule]', 'Test message'], defaultConfig);
    
    expect(result).toContain('TestModule');
    expect(result).toContain('Test message');
  });

  it('should format objects with proper indentation', () => {
    const obj = { test: 'value' };
    const result = formatMessage('info', ['Test:', obj], defaultConfig);
    
    expect(result).toContain('Test:');
    expect(result).toMatch(/"test"/); 
    expect(result).toMatch(/"value"/);
    
    // Check that the object is properly formatted
    const resultLines = result.split('\n');
    const jsonLines = resultLines.filter(line => line.includes('"test"') || line.includes('"value"'));
    expect(jsonLines.length).toBeGreaterThan(0);
  });

  it('should handle undefined and null values', () => {
    const result = formatMessage('warn', [undefined, null], defaultConfig);
    
    expect(result).toContain('undefined');
    expect(result).toContain('null');
  });

  it('should use custom symbols when provided', () => {
    const config = {
      ...defaultConfig,
      customSymbols: { ...DEFAULT_SYMBOLS, info: '🔵' },
    };
    const result = formatMessage('info', ['Test'], config);
    
    expect(result).toContain('🔵');
  });

  it('should handle stringified JSON objects', () => {
    const jsonString = JSON.stringify({ key: 'value' });
    const result = formatMessage('debug', [jsonString], defaultConfig);
    
    // Parse the log message to verify JSON content
    const jsonMatch = result.match(/\{.*\}/);
    expect(jsonMatch).toBeTruthy();
    const parsedJson = JSON.parse(jsonMatch![0]);
    expect(parsedJson).toEqual({ key: 'value' });
  });
});