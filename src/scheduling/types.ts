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

export interface SchedulingAlgorithm {
  name: string;
  schedule(quality: number, state: SchedulingState, today: string): SchedulingResult;
  initialState(): SchedulingState;
}
