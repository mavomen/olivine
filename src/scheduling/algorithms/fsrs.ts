import type { SchedulingAlgorithm, SchedulingState, SchedulingResult } from '../types';

const W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
  1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483,
  0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
];

const REQUESTED_RETENTION = 0.9;

function qualityToGrade(quality: number): number {
  if (quality < 0 || quality > 5) {
    throw new Error(`Quality must be between 0 and 5, got ${quality}`);
  }
  if (quality <= 1) return 1;
  if (quality === 2) return 2;
  if (quality === 3) return 3;
  return 4;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function forgettingCurveParams(): { decay: number; factor: number } {
  const decay = -W[20]!;
  const factor = Math.pow(0.9, 1 / decay) - 1;
  return { decay, factor };
}

function retrievability(elapsed: number, stability: number): number {
  if (stability <= 0) return 1;
  const { decay, factor } = forgettingCurveParams();
  return Math.pow(1 + factor * elapsed / stability, decay);
}

function initialStability(grade: number): number {
  return Math.max(W[grade - 1]!, 0.1);
}

function initialDifficulty(grade: number): number {
  return clamp(W[4]! - Math.exp((grade - 1) * W[5]!) + 1, 1, 10);
}

function nextDifficulty(d: number, grade: number): number {
  const deltaD = -W[6]! * (grade - 3);
  const dNew = d + deltaD * (10 - d) / 9;
  const dMean = W[7]! * initialDifficulty(4) + (1 - W[7]!) * dNew;
  return clamp(dMean, 1, 10);
}

function nextStabilitySuccess(d: number, s: number, r: number, grade: number): number {
  const hardPenalty = grade === 2 ? W[15]! : 1;
  const easyBoost = grade === 4 ? W[16]! : 1;
  const sNew = s * (1 + Math.exp(W[8]!) * (11 - d) * Math.pow(s, -W[9]!) * (Math.exp(W[10]! * (1 - r)) - 1) * hardPenalty * easyBoost);
  return clamp(sNew, 0.001, 36500);
}

function nextStabilityFailure(d: number, s: number, r: number): number {
  const sNew = W[11]! * Math.pow(d, -W[12]!) * (Math.pow(s + 1, W[13]!) - 1) * Math.exp(W[14]! * (1 - r));
  return clamp(sNew, 0.001, 36500);
}

function nextInterval(stability: number): number {
  const { decay, factor } = forgettingCurveParams();
  const interval = (stability / factor) * (Math.pow(REQUESTED_RETENTION, 1 / decay) - 1);
  return Math.max(1, Math.round(interval));
}

function firstReview(grade: number): { stability: number; difficulty: number; interval: number } {
  const s = initialStability(grade);
  const d = initialDifficulty(grade);
  const interval = nextInterval(s);
  return { stability: s, difficulty: d, interval };
}

function subsequentReview(grade: number, state: SchedulingState, today: string): { stability: number; difficulty: number; interval: number } {
  const elapsed = state.lastReviewDate
    ? Math.max(0, Math.floor((new Date(today).getTime() - new Date(state.lastReviewDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const r = retrievability(elapsed, state.stability);

  let sNew: number;
  if (grade === 1) {
    sNew = nextStabilityFailure(state.difficulty, state.stability, r);
  } else {
    sNew = nextStabilitySuccess(state.difficulty, state.stability, r, grade);
  }

  const dNew = nextDifficulty(state.difficulty, grade);
  const interval = nextInterval(sNew);

  return { stability: sNew, difficulty: dNew, interval };
}

function schedule(quality: number, state: SchedulingState, today: string): SchedulingResult {
  const grade = qualityToGrade(quality);

  const isFirstReview = state.lastReviewDate === null || state.stability <= 0;

  let stability: number;
  let difficulty: number;
  let interval: number;

  if (isFirstReview) {
    const result = firstReview(grade);
    stability = result.stability;
    difficulty = result.difficulty;
    interval = result.interval;
  } else {
    const result = subsequentReview(grade, state, today);
    stability = result.stability;
    difficulty = result.difficulty;
    interval = result.interval;
  }

  return {
    box: 1,
    intervalDays: interval,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: '',
    archived: false,
    stability,
    difficulty,
  };
}

function initialState(): SchedulingState {
  return {
    box: 1,
    repetitions: 0,
    intervalDays: 1,
    easeFactor: 2.5,
    archived: false,
    stability: 0,
    difficulty: 5,
    lastReviewDate: null,
  };
}

export const fsrsAlgorithm: SchedulingAlgorithm = {
  name: 'fsrs',
  schedule,
  initialState,
};
