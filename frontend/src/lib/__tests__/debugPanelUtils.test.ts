import { describe, test, expect } from 'vitest';
import { formatData } from '../debugPanelUtils';

describe('formatData', () => {
  test('returns "—" for null', () => {
    expect(formatData(null)).toBe('—');
  });

  test('returns "—" for undefined', () => {
    expect(formatData(undefined)).toBe('—');
  });

  test('returns string as is', () => {
    expect(formatData('test string')).toBe('test string');
  });

  test('formats object to JSON', () => {
    const obj = { key: 'value', num: 42 };
    expect(formatData(obj)).toBe(JSON.stringify(obj, null, 2));
  });

  test('handles empty object', () => {
    expect(formatData({})).toBe(JSON.stringify({}, null, 2));
  });
});
