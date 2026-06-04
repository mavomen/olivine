import { leitner, MAX_BOX } from '../../src/scheduling/algorithms/leitner';

describe('Leitner Box algorithm', () => {
  it('should start at Box 1 for a new card', () => {
    const result = leitner(4, 1);
    expect(result.box).toBe(2);
    expect(result.archived).toBe(false);
  });

  it('should promote on correct answer (quality >= 3)', () => {
    const result = leitner(4, 3);
    expect(result.box).toBe(4);
    expect(result.archived).toBe(false);
  });

  it('should reset to Box 1 on wrong answer (quality < 3)', () => {
    const result = leitner(2, 5);
    expect(result.box).toBe(1);
    expect(result.archived).toBe(false);
  });

  it('should archive when promoted past Box 7', () => {
    const result = leitner(4, 7);
    expect(result.box).toBe(7);
    expect(result.archived).toBe(true);
  });

  it('should reset to Box 1 on failure even from high boxes', () => {
    const result = leitner(0, 7);
    expect(result.box).toBe(1);
    expect(result.archived).toBe(false);
  });

  it('should throw for invalid quality', () => {
    expect(() => leitner(-1)).toThrow();
    expect(() => leitner(6)).toThrow();
  });
});
