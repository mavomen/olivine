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

export interface LeitnerResult {
  box: number;
  intervalDays: number;
  archived: boolean;
}

export function leitner(
  quality: number,
  currentBox: number = 1,
): LeitnerResult {
  if (quality < 0 || quality > 5) {
    throw new Error(`Quality must be between 0 and 5, got ${quality}`);
  }

  if (quality < 3) {
    // Wrong answer: back to Box 1
    return {
      box: 1,
      intervalDays: BOX_INTERVALS[1]!,
      archived: false,
    };
  }

  // Correct answer: promote
  const newBox = currentBox + 1;
  if (newBox > MAX_BOX) {
    // Graduated: archive
    return {
      box: MAX_BOX,
      intervalDays: BOX_INTERVALS[MAX_BOX]!,
      archived: true,
    };
  }

  return {
    box: newBox,
    intervalDays: BOX_INTERVALS[newBox]!,
    archived: false,
  };
}
