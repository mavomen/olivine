import { fsrsAlgorithm } from '../../src/scheduling/algorithms/fsrs';

describe('FSRS algorithm', () => {
  const algo = fsrsAlgorithm;

  it('should start with default initial state', () => {
    const state = algo.initialState();
    expect(state.box).toBe(1);
    expect(state.repetitions).toBe(0);
    expect(state.intervalDays).toBe(1);
    expect(state.easeFactor).toBe(2.5);
    expect(state.archived).toBe(false);
    expect(state.stability).toBe(0);
    expect(state.difficulty).toBe(5);
    expect(state.lastReviewDate).toBeNull();
  });

  it('should map quality 0-1 to grade Again', () => {
    const state = algo.initialState();
    const r0 = algo.schedule(0, state, '2025-06-01');
    const r1 = algo.schedule(1, state, '2025-06-01');
    expect(r0.stability).toBe(r1.stability);
    expect(r0.difficulty).toBe(r1.difficulty);
  });

  it('should map quality 2 to grade Hard', () => {
    const state = algo.initialState();
    const result = algo.schedule(2, state, '2025-06-01');
    expect(result.stability).toBeGreaterThan(0);
  });

  it('should map quality 3 to grade Good', () => {
    const state = algo.initialState();
    const result = algo.schedule(3, state, '2025-06-01');
    expect(result.stability).toBeGreaterThan(0);
  });

  it('should map quality 4-5 to grade Easy', () => {
    const state = algo.initialState();
    const r4 = algo.schedule(4, state, '2025-06-01');
    const r5 = algo.schedule(5, state, '2025-06-01');
    expect(r4.stability).toBe(r5.stability);
  });

  it('should produce increasing stability for Again < Hard < Good < Easy on first review', () => {
    const state = algo.initialState();
    const again = algo.schedule(0, state, '2025-06-01');
    const hard = algo.schedule(2, state, '2025-06-01');
    const good = algo.schedule(3, state, '2025-06-01');
    const easy = algo.schedule(5, state, '2025-06-01');

    expect(again.stability).toBeLessThan(hard.stability);
    expect(hard.stability).toBeLessThan(good.stability);
    expect(good.stability).toBeLessThan(easy.stability);
  });

  it('should produce decreasing difficulty for Again > Hard > Good > Easy on first review', () => {
    const state = algo.initialState();
    const again = algo.schedule(0, state, '2025-06-01');
    const hard = algo.schedule(2, state, '2025-06-01');
    const good = algo.schedule(3, state, '2025-06-01');
    const easy = algo.schedule(5, state, '2025-06-01');

    expect(again.difficulty).toBeGreaterThan(hard.difficulty);
    expect(hard.difficulty).toBeGreaterThan(good.difficulty);
    expect(good.difficulty).toBeGreaterThan(easy.difficulty);
  });

  it('should increase stability on successful subsequent review', () => {
    const state = algo.initialState();
    const first = algo.schedule(3, { ...state, lastReviewDate: null }, '2025-06-01');

    const secondState = {
      ...state,
      stability: first.stability,
      difficulty: first.difficulty,
      intervalDays: first.intervalDays,
      lastReviewDate: '2025-06-01',
    };

    const second = algo.schedule(3, secondState, '2025-06-08');
    expect(second.stability).toBeGreaterThan(first.stability);
  });

  it('should decrease difficulty on successful review', () => {
    const state = algo.initialState();
    const first = algo.schedule(3, { ...state, lastReviewDate: null }, '2025-06-01');

    const secondState = {
      ...state,
      stability: first.stability,
      difficulty: first.difficulty,
      intervalDays: first.intervalDays,
      lastReviewDate: '2025-06-01',
    };

    const second = algo.schedule(3, secondState, '2025-06-08');
    expect(second.difficulty).toBeLessThan(first.difficulty);
  });

  it('should apply Hard penalty reducing stability growth', () => {
    const state = algo.initialState();
    const first = algo.schedule(3, { ...state, lastReviewDate: null }, '2025-06-01');

    const baseState = {
      ...state,
      stability: first.stability,
      difficulty: first.difficulty,
      intervalDays: first.intervalDays,
      lastReviewDate: '2025-06-01',
    };

    const hard = algo.schedule(2, { ...baseState }, '2025-06-08');
    const good = algo.schedule(3, { ...baseState }, '2025-06-08');

    expect(hard.stability).toBeLessThan(good.stability);
  });

  it('should apply Easy boost increasing stability growth', () => {
    const state = algo.initialState();
    const first = algo.schedule(3, { ...state, lastReviewDate: null }, '2025-06-01');

    const baseState = {
      ...state,
      stability: first.stability,
      difficulty: first.difficulty,
      intervalDays: first.intervalDays,
      lastReviewDate: '2025-06-01',
    };

    const good = algo.schedule(3, { ...baseState }, '2025-06-08');
    const easy = algo.schedule(5, { ...baseState }, '2025-06-08');

    expect(easy.stability).toBeGreaterThan(good.stability);
  });

  it('should reduce stability on failed review', () => {
    const state = algo.initialState();
    const first = algo.schedule(3, { ...state, lastReviewDate: null }, '2025-06-01');

    const secondState = {
      ...state,
      stability: first.stability,
      difficulty: first.difficulty,
      intervalDays: first.intervalDays,
      lastReviewDate: '2025-06-01',
    };

    const fail = algo.schedule(0, secondState, '2025-06-08');
    expect(fail.stability).toBeLessThan(first.stability);
  });

  it('should return interval of at least 1 day', () => {
    const state = algo.initialState();
    const result = algo.schedule(0, state, '2025-06-01');
    expect(result.intervalDays).toBeGreaterThanOrEqual(1);
  });

  it('should throw for invalid quality', () => {
    const state = algo.initialState();
    expect(() => algo.schedule(-1, state, '2025-06-01')).toThrow();
    expect(() => algo.schedule(6, state, '2025-06-01')).toThrow();
  });

  it('should produce deterministic results with default weights', () => {
    const state = algo.initialState();
    const a = algo.schedule(3, state, '2025-06-01');
    const b = algo.schedule(3, state, '2025-06-01');
    expect(a.stability).toBe(b.stability);
    expect(a.difficulty).toBe(b.difficulty);
    expect(a.intervalDays).toBe(b.intervalDays);
  });

  it('should handle overdue review boosting next stability', () => {
    const state = algo.initialState();
    const first = algo.schedule(3, { ...state, lastReviewDate: null }, '2025-06-01');

    const baseState = {
      ...state,
      stability: first.stability,
      difficulty: first.difficulty,
      intervalDays: first.intervalDays,
      lastReviewDate: '2025-06-01',
    };

    // Review exactly on time (7 days later, stability is ~S)
    const onTime = algo.schedule(3, { ...baseState }, '2025-06-08');

    // Review overdue (30 days later, R is low, should get additional boost)
    const overdue = algo.schedule(3, { ...baseState }, '2025-07-01');

    expect(overdue.stability).toBeGreaterThan(onTime.stability);
  });
});
