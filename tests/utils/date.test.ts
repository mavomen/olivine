import { todayISO, addDays, diffDays } from '../../src/utils/date';

describe('todayISO', () => {
  it('should return today in YYYY-MM-DD format', () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should match the current date', () => {
    const result = todayISO();
    const expected = new Date().toISOString().split('T')[0];
    expect(result).toBe(expected);
  });
});

describe('addDays', () => {
  it('should add days to a date', () => {
    expect(addDays('2024-01-01', 5)).toBe('2024-01-06');
  });

  it('should handle negative days', () => {
    expect(addDays('2024-01-10', -3)).toBe('2024-01-07');
  });

  it('should handle zero days', () => {
    expect(addDays('2024-06-15', 0)).toBe('2024-06-15');
  });

  it('should cross month boundaries', () => {
    expect(addDays('2024-01-28', 5)).toBe('2024-02-02');
  });

  it('should cross year boundaries', () => {
    expect(addDays('2024-12-30', 5)).toBe('2025-01-04');
  });

  it('should handle leap year February', () => {
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01');
  });

  it('should handle non-leap year February', () => {
    expect(addDays('2023-02-28', 2)).toBe('2023-03-02');
  });
});

describe('diffDays', () => {
  it('should return 0 for the same date', () => {
    expect(diffDays('2024-01-01', '2024-01-01')).toBe(0);
  });

  it('should return positive days when later date is second arg', () => {
    expect(diffDays('2024-01-01', '2024-01-06')).toBe(5);
  });

  it('should return negative days when later date is first arg', () => {
    expect(diffDays('2024-01-06', '2024-01-01')).toBe(-5);
  });

  it('should cross month boundaries', () => {
    expect(diffDays('2024-01-01', '2024-02-01')).toBe(31);
  });

  it('should cross year boundaries', () => {
    expect(diffDays('2024-12-31', '2025-01-01')).toBe(1);
  });

  it('should handle leap year February 29', () => {
    expect(diffDays('2024-02-28', '2024-03-01')).toBe(2);
  });
});
