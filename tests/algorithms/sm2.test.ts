import { sm2, SM2_DEFAULTS } from '../../src/algorithms/sm2';

describe('SM-2 algorithm', () => {
  describe('ease factor', () => {
    it('should start at initial ease factor for a first review', () => {
      const result = sm2(4);
      expect(result.easeFactor).toBe(SM2_DEFAULTS.INITIAL_EASE_FACTOR);
    });

    it('should decrease ease factor after a failed review', () => {
      const result = sm2(0, 2.5, 3, 10);
      expect(result.easeFactor).toBeLessThan(2.5);
    });

    it('should not drop below minimum ease factor', () => {
      const result = sm2(0, SM2_DEFAULTS.MIN_EASE_FACTOR, 3, 10);
      expect(result.easeFactor).toBe(SM2_DEFAULTS.MIN_EASE_FACTOR);
    });

    it('should increase ease factor after an easy review', () => {
      const result = sm2(5, 2.5, 3, 10);
      expect(result.easeFactor).toBeGreaterThan(2.5);
    });
  });

  describe('repetitions and intervals', () => {
    it('should set interval to 1 day after first successful review', () => {
      const result = sm2(4, 2.5, 0, 0);
      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(1);
    });

    it('should set interval to 6 days after second successful review', () => {
      const result = sm2(4, 2.5, 1, 1);
      expect(result.repetitions).toBe(2);
      expect(result.intervalDays).toBe(6);
    });

    it('should compute interval from previous interval and ease factor after third+ review', () => {
      const result = sm2(4, 2.5, 2, 6);
      expect(result.repetitions).toBe(3);
      expect(result.intervalDays).toBe(15); // 6 * 2.5 = 15
    });

    it('should reset repetitions after a failed review', () => {
      const result = sm2(0, 2.5, 3, 10);
      expect(result.repetitions).toBe(0);
      expect(result.intervalDays).toBe(SM2_DEFAULTS.FAIL_INTERVAL);
    });
  });

  describe('validation', () => {
    it('should throw an error for quality < 0', () => {
      expect(() => sm2(-1)).toThrow();
    });

    it('should throw an error for quality > 5', () => {
      expect(() => sm2(6)).toThrow();
    });
  });
});
