import type { SchedulingAlgorithm, SchedulingState, SchedulingResult } from '../types';

export const BOX_INTERVALS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
  6: 32,
  7: 64,
};

export const MAX_BOX = 7;

function schedule(quality: number, state: SchedulingState, _today: string): SchedulingResult {
  if (quality < 0 || quality > 5) {
    throw new Error(`Quality must be between 0 and 5, got ${quality}`);
  }

  if (quality < 3) {
    const box = 1;
    return {
      box,
      intervalDays: BOX_INTERVALS[box]!,
      repetitions: 0,
      easeFactor: state.easeFactor,
      dueDate: '',
      archived: false,
    };
  }

  const newBox = state.box + 1;
  if (newBox > MAX_BOX) {
    return {
      box: MAX_BOX,
      intervalDays: BOX_INTERVALS[MAX_BOX]!,
      repetitions: state.repetitions + 1,
      easeFactor: state.easeFactor,
      dueDate: '',
      archived: true,
    };
  }

  return {
    box: newBox,
    intervalDays: BOX_INTERVALS[newBox]!,
    repetitions: state.repetitions + 1,
    easeFactor: state.easeFactor,
    dueDate: '',
    archived: false,
  };
}

function initialState(): SchedulingState {
  return { box: 1, repetitions: 0, intervalDays: BOX_INTERVALS[1]!, easeFactor: 2.5, archived: false };
}

export const leitnerAlgorithm: SchedulingAlgorithm = {
  name: 'leitner',
  schedule,
  initialState,
};
