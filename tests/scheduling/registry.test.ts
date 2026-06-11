import { getAlgorithm, listAlgorithms } from '../../src/scheduling/registry';

describe('listAlgorithms', () => {
  it('should return leitner and sm2', () => {
    const algos = listAlgorithms();
    expect(algos).toEqual(['leitner', 'sm2']);
  });

  it('should return a new array each call (immutable)', () => {
    const a = listAlgorithms();
    const b = listAlgorithms();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

describe('getAlgorithm', () => {
  it('should return the leitner algorithm', () => {
    const algo = getAlgorithm('leitner');
    expect(algo.name).toBe('leitner');
    expect(typeof algo.schedule).toBe('function');
    expect(typeof algo.initialState).toBe('function');
  });

  it('should return the sm2 algorithm', () => {
    const algo = getAlgorithm('sm2');
    expect(algo.name).toBe('sm2');
    expect(typeof algo.schedule).toBe('function');
    expect(typeof algo.initialState).toBe('function');
  });

  it('should throw for unknown algorithm', () => {
    expect(() => getAlgorithm('fsrs')).toThrow('Unknown scheduling algorithm: "fsrs"');
  });

  it('should list available algorithms in the error message', () => {
    expect(() => getAlgorithm('invalid')).toThrow(/Available: leitner, sm2/);
  });
});
