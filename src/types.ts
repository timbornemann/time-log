export interface Project {
  id: string;
  name: string;
  color: string; // Hex color code e.g. "#3b82f6"
  createdAt: number;
}

export type SessionType = 'stopwatch' | 'timer' | 'pomodoro_work' | 'pomodoro_break';

export interface TimeLog {
  id: string;
  projectId: string;
  startTime: number; // Timestamp in ms
  endTime: number; // Timestamp in ms
  duration: number; // Active duration in seconds
  pauseDuration: number; // Pause duration in seconds
  type: SessionType;
  date: string; // YYYY-MM-DD
}

export interface ActiveSession {
  projectId: string;
  startTime: number;
  elapsedSeconds: number;
  isPaused: boolean;
  pauseStartTime: number | null;
  accumulatedPauseSeconds: number;
  mode: 'stopwatch' | 'timer' | 'pomodoro';
  timerTotalSeconds: number; // Required value for countdown and Pomodoro
  pomodoroPhase: 'work' | 'break' | null;
  pomodoroCycleCount: number;
}
