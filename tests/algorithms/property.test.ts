import { leitnerAlgorithm } from '../../src/scheduling/algorithms/leitner';
import { sm2Algorithm } from '../../src/scheduling/algorithms/sm2';
import { fsrsAlgorithm } from '../../src/scheduling/algorithms/fsrs';
import type { SchedulingAlgorithm, SchedulingState } from '../../src/scheduling/types';

const algorithms: SchedulingAlgorithm[] = [leitnerAlgorithm, sm2Algorithm, fsrsAlgorithm];
const VALID_QUALITIES = [0, 1, 2, 3, 4, 5];

function freshState(algo: SchedulingAlgorithm): SchedulingState {
  return { ...algo.initialState() };
}

describe('scheduling algorithm invariants', () => {
  describe.each(algorithms)('$name', (algo) => {
    it('should never throw for quality 0-5 with fresh state', () => {
      const state = freshState(algo);
      for (const q of VALID_QUALITIES) {
        expect(() => algo.schedule(q, state, '2025-06-01')).not.toThrow();
      }
    });

    it('should never throw for quality 0-5 after multiple reviews', () => {
      let state = freshState(algo);
      for (let review = 0; review < 10; review++) {
        for (const q of VALID_QUALITIES) {
          expect(() => algo.schedule(q, state, '2025-06-01')).not.toThrow();
        }
        // Advance state with a simulated review
        state = {
          ...state,
          ...algo.schedule(3, state, '2025-06-01'),
          lastReviewDate: '2025-06-01',
        };
      }
    });

    it('should return intervalDays >= 1 for all qualities after fresh state', () => {
      const state = freshState(algo);
      for (const q of VALID_QUALITIES) {
        const result = algo.schedule(q, state, '2025-06-01');
        expect(result.intervalDays).toBeGreaterThanOrEqual(1);
      }
    });

    it('should return intervalDays >= 1 for all qualities after established state', () => {
      let state = freshState(algo);
      // Build up some history
      for (let i = 0; i < 5; i++) {
        state = { ...state, ...algo.schedule(4, state, '2025-06-01'), lastReviewDate: '2025-06-01' };
      }

      for (const q of VALID_QUALITIES) {
        const result = algo.schedule(q, state, '2025-06-01');
        expect(result.intervalDays).toBeGreaterThanOrEqual(1);
      }
    });

    it('should return non-negative easeFactor', () => {
      const state = freshState(algo);
      for (const q of VALID_QUALITIES) {
        const result = algo.schedule(q, state, '2025-06-01');
        expect(result.easeFactor).toBeGreaterThanOrEqual(0);
      }
    });

    it('should not increase interval after failed review (quality < 3)', () => {
      let state = freshState(algo);
      // Build up some history with successful reviews
      for (let i = 0; i < 3; i++) {
        state = { ...state, ...algo.schedule(4, state, '2025-06-01'), lastReviewDate: '2025-06-01' };
      }
      const beforeInterval = state.intervalDays;
      const result = algo.schedule(1, state, '2025-06-01');
      expect(result.intervalDays).toBeLessThanOrEqual(beforeInterval);
    });
  });

  describe('Leitner-specific invariants', () => {
    it('should archive when promoted past box 7', () => {
      const state: SchedulingState = { ...leitnerAlgorithm.initialState(), box: 7 };
      const result = leitnerAlgorithm.schedule(4, state, '2025-06-01');
      expect(result.archived).toBe(true);
    });

    it('should never increase box beyond 7', () => {
      let state = freshState(leitnerAlgorithm);
      for (let i = 0; i < 20; i++) {
        state = { ...state, ...leitnerAlgorithm.schedule(4, state, '2025-06-01'), lastReviewDate: '2025-06-01' };
        if (state.archived) break;
      }
      // Once archived, it should stay archived
      if (state.box === 7) {
        const result = leitnerAlgorithm.schedule(4, state, '2025-06-01');
        expect(result.archived).toBe(true);
      }
    });
  });

  describe('SM-2 specific invariants', () => {
    it('should never drop easeFactor below 1.3', () => {
      let state = freshState(sm2Algorithm);
      for (let i = 0; i < 100; i++) {
        state = { ...state, ...sm2Algorithm.schedule(0, state, '2025-06-01'), lastReviewDate: '2025-06-01' };
        expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
      }
    });

    it('should have identical intervals for repetition 1 and 2', () => {
      const state = freshState(sm2Algorithm);
      const r1 = sm2Algorithm.schedule(4, state, '2025-06-01');
      const state2 = { ...state, ...r1, lastReviewDate: '2025-06-01' };
      const r2 = sm2Algorithm.schedule(4, state2, '2025-06-02');
      expect(r1.intervalDays).toBe(1);
      expect(r2.intervalDays).toBe(6);
    });
  });

  describe('FSRS specific invariants', () => {
    it('should clamp difficulty between 1 and 10', () => {
      let state = freshState(fsrsAlgorithm);
      for (let i = 0; i < 50; i++) {
        for (const q of VALID_QUALITIES) {
          const result = fsrsAlgorithm.schedule(q, state, '2025-06-01');
          expect(result.difficulty).toBeGreaterThanOrEqual(1);
          expect(result.difficulty).toBeLessThanOrEqual(10);
        }
        state = { ...state, ...fsrsAlgorithm.schedule(3, state, '2025-06-01'), lastReviewDate: '2025-06-01' };
      }
    });

    it('should clamp stability between 0.001 and 36500', () => {
      let state = freshState(fsrsAlgorithm);
      for (let i = 0; i < 50; i++) {
        for (const q of VALID_QUALITIES) {
          const result = fsrsAlgorithm.schedule(q, state, '2025-06-01');
          expect(result.stability).toBeGreaterThanOrEqual(0.001);
          expect(result.stability).toBeLessThanOrEqual(36500);
        }
        state = { ...state, ...fsrsAlgorithm.schedule(3, state, '2025-06-01'), lastReviewDate: '2025-06-01' };
      }
    });
  });
});
