import { leitnerAlgorithm, MAX_BOX } from '../../src/scheduling/algorithms/leitner';

describe('Leitner Box algorithm', () => {
  const algo = leitnerAlgorithm;

  it('should start at Box 1 for a new card', () => {
    const state = algo.initialState();
    expect(state.box).toBe(1);
  });

  it('should promote on correct answer (quality >= 3)', () => {
    const state = algo.initialState();
    const result = algo.schedule(4, state, '2025-06-01');
    expect(result.box).toBe(2);
    expect(result.archived).toBe(false);
  });

  it('should promote from Box 3 to Box 4', () => {
    const state = algo.initialState();
    state.box = 3;
    const result = algo.schedule(4, state, '2025-06-01');
    expect(result.box).toBe(4);
    expect(result.archived).toBe(false);
  });

  it('should reset to Box 1 on wrong answer (quality < 3)', () => {
    const state = algo.initialState();
    state.box = 5;
    const result = algo.schedule(2, state, '2025-06-01');
    expect(result.box).toBe(1);
    expect(result.archived).toBe(false);
  });

  it('should archive when promoted past Box 7', () => {
    const state = algo.initialState();
    state.box = 7;
    const result = algo.schedule(4, state, '2025-06-01');
    expect(result.box).toBe(7);
    expect(result.archived).toBe(true);
  });

  it('should reset to Box 1 on failure even from high boxes', () => {
    const state = algo.initialState();
    state.box = 7;
    const result = algo.schedule(0, state, '2025-06-01');
    expect(result.box).toBe(1);
    expect(result.archived).toBe(false);
  });

  it('should throw for invalid quality', () => {
    const state = algo.initialState();
    expect(() => algo.schedule(-1, state, '2025-06-01')).toThrow();
    expect(() => algo.schedule(6, state, '2025-06-01')).toThrow();
  });

  it('should set interval based on box after promotion', () => {
    const state = algo.initialState();
    const result = algo.schedule(4, state, '2025-06-01');
    expect(result.intervalDays).toBe(2); // Box 2 interval
  });
});
