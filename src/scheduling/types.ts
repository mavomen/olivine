/** The persisted scheduling state for a note. */
export interface SchedulingState {
  box: number;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  archived: boolean;
  stability: number;
  difficulty: number;
  lastReviewDate: string | null;
}

/** The result of running a scheduling algorithm. */
export interface SchedulingResult {
  box: number;
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  dueDate: string;
  archived: boolean;
  stability: number;
  difficulty: number;
}

/** Contract that all scheduling algorithms must implement. */
export interface SchedulingAlgorithm {
  name: string;
  schedule(quality: number, state: SchedulingState, today: string): SchedulingResult;
  initialState(): SchedulingState;
}
