import type { SchedulingAlgorithm, SchedulingState, SchedulingResult } from '../types';

export const SM2_DEFAULTS = {
  INITIAL_EASE_FACTOR: 2.5,
  MIN_EASE_FACTOR: 1.3,
  EASE_MODIFIER: {
    0: -0.8,
    1: -0.5,
    2: -0.3,
    3: -0.1,
    4: 0.0,
    5: 0.1,
  } as Record<number, number>,
  NEW_INTERVAL: 1,
  FAIL_INTERVAL: 1,
};

function schedule(quality: number, state: SchedulingState, _today: string): SchedulingResult {
  if (quality < 0 || quality > 5) {
    throw new Error(`Quality must be between 0 and 5, got ${quality}`);
  }

  const easeModifier = SM2_DEFAULTS.EASE_MODIFIER[quality] ?? -0.3;
  const newEaseFactor = Math.max(
    SM2_DEFAULTS.MIN_EASE_FACTOR,
    state.easeFactor + easeModifier,
  );

  if (quality < 3) {
    return {
      box: 1,
      easeFactor: newEaseFactor,
      repetitions: 0,
      intervalDays: SM2_DEFAULTS.FAIL_INTERVAL,
      dueDate: '',
      archived: false,
    };
  }

  const newRepetitions = state.repetitions + 1;
  let newInterval: number;

  if (newRepetitions === 1) {
    newInterval = 1;
  } else if (newRepetitions === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(state.intervalDays * state.easeFactor);
  }

  return {
    box: state.box + 1,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
    intervalDays: newInterval,
    dueDate: '',
    archived: false,
  };
}

function initialState(): SchedulingState {
  return { box: 1, repetitions: 0, intervalDays: 1, easeFactor: SM2_DEFAULTS.INITIAL_EASE_FACTOR, archived: false };
}

export const sm2Algorithm: SchedulingAlgorithm = {
  name: 'sm2',
  schedule,
  initialState,
};
