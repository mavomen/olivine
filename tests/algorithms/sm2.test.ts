import { sm2Algorithm } from '../../src/scheduling/algorithms/sm2';

describe('SM-2 algorithm', () => {
  const algo = sm2Algorithm;

  it('should start at Box 1 with default ease factor', () => {
    const state = algo.initialState();
    expect(state.box).toBe(1);
    expect(state.easeFactor).toBe(2.5);
    expect(state.repetitions).toBe(0);
  });

  it('should set interval to 1 day on first correct review', () => {
    const state = algo.initialState();
    const result = algo.schedule(4, state, '2025-06-01');
    expect(result.intervalDays).toBe(1);
    expect(result.repetitions).toBe(1);
  });

  it('should set interval to 6 days on second correct review', () => {
    const state = algo.initialState();
    state.repetitions = 1;
    state.intervalDays = 1;
    const result = algo.schedule(4, state, '2025-06-02');
    expect(result.intervalDays).toBe(6);
    expect(result.repetitions).toBe(2);
  });

  it('should multiply interval by ease factor on 3rd+ correct review', () => {
    const state = algo.initialState();
    state.repetitions = 2;
    state.intervalDays = 6;
    state.easeFactor = 2.5;
    const result = algo.schedule(4, state, '2025-06-08');
    expect(result.intervalDays).toBe(15); // round(6 * 2.5)
    expect(result.repetitions).toBe(3);
  });

  it('should reset repetitions to 0 on failed review', () => {
    const state = algo.initialState();
    state.repetitions = 5;
    state.intervalDays = 30;
    const result = algo.schedule(1, state, '2025-06-01');
    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
  });

  it('should decrease ease factor on poor quality', () => {
    const state = algo.initialState();
    state.easeFactor = 2.5;
    const result = algo.schedule(0, state, '2025-06-01');
    expect(result.easeFactor).toBe(1.7); // 2.5 + (-0.8)
  });

  it('should increase ease factor on perfect quality', () => {
    const state = algo.initialState();
    state.easeFactor = 2.5;
    const result = algo.schedule(5, state, '2025-06-01');
    expect(result.easeFactor).toBe(2.6); // 2.5 + 0.1
  });

  it('should not let ease factor drop below minimum', () => {
    const state = algo.initialState();
    state.easeFactor = 1.3;
    const result = algo.schedule(0, state, '2025-06-01');
    expect(result.easeFactor).toBe(1.3); // clamped to MIN_EASE_FACTOR
  });

  it('should throw for invalid quality', () => {
    const state = algo.initialState();
    expect(() => algo.schedule(-1, state, '2025-06-01')).toThrow();
    expect(() => algo.schedule(6, state, '2025-06-01')).toThrow();
  });
});
