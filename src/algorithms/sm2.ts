export interface SM2Result {
  easeFactor: number;
  repetitions: number;
  intervalDays: number;
  dueDate: string;
}

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
  },
  NEW_INTERVAL: 1,
  FAIL_INTERVAL: 1,
};

export function sm2(
  quality: number,
  previousEaseFactor: number = SM2_DEFAULTS.INITIAL_EASE_FACTOR,
  previousRepetitions: number = 0,
  previousInterval: number = 0,
): SM2Result {
  if (quality < 0 || quality > 5) {
    throw new Error(`Quality must be between 0 and 5, got ${quality}`);
  }

  const easeModifier = SM2_DEFAULTS.EASE_MODIFIER[quality as keyof typeof SM2_DEFAULTS.EASE_MODIFIER] ?? -0.3;
  const newEaseFactor = Math.max(
    SM2_DEFAULTS.MIN_EASE_FACTOR,
    previousEaseFactor + easeModifier,
  );

  if (quality < 3) {
    // Failed review: reset repetitions, short interval
    return {
      easeFactor: newEaseFactor,
      repetitions: 0,
      intervalDays: SM2_DEFAULTS.FAIL_INTERVAL,
      dueDate: '',
    };
  }

  // Successful review
  const newRepetitions = previousRepetitions + 1;
  let newInterval: number;

  if (newRepetitions === 1) {
    newInterval = 1;
  } else if (newRepetitions === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(previousInterval * previousEaseFactor);
  }

  return {
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
    intervalDays: newInterval,
    dueDate: '',
  };
}
