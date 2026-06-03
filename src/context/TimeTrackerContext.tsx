import React, { createContext, useContext, useEffect, useState } from 'react';
import { Project, SessionType, TimeLog } from '../types';

interface TimeTrackerContextType {
  projects: Project[];
  timeLogs: TimeLog[];
  currentProjectId: string;
  setCurrentProjectId: (id: string) => void;
  addProject: (name: string, color: string) => void;
  editProject: (id: string, name: string, color: string) => void;
  deleteProject: (id: string) => void;
  addTimeLog: (
    projectId: string,
    startTime: number,
    endTime: number,
    duration: number,
    pauseDuration: number,
    type: TimeLog['type']
  ) => void;
  deleteTimeLog: (id: string) => void;
  clearAllLogs: () => void;
}

const DAY_MS = 86_400_000;

const STORAGE_KEYS = {
  projects: 'zeitlog_projects',
  logs: 'zeitlog_timelogs',
  activeProject: 'zeitlog_active_project',
} as const;

const formatDateStr = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getDaySeeds = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today.getTime() - DAY_MS);

  return {
    todayStartMs: today.getTime(),
    yesterdayStartMs: yesterday.getTime(),
    todayStr: formatDateStr(today),
    yesterdayStr: formatDateStr(yesterday),
  };
};

const withTime = (dayStartMs: number, hour: number, minute: number) => {
  return dayStartMs + (hour * 60 + minute) * 60_000;
};

const DEFAULT_PROJECTS: Project[] = [
  { id: 'p1', name: 'Studium & Lernen', color: '#3b82f6', createdAt: Date.now() - 5 * DAY_MS },
  { id: 'p2', name: 'Arbeit & Karriere', color: '#10b981', createdAt: Date.now() - 4 * DAY_MS },
  { id: 'p3', name: 'Sport & Fitness', color: '#ef4444', createdAt: Date.now() - 3 * DAY_MS },
  { id: 'p4', name: 'Eigene Projekte', color: '#f59e0b', createdAt: Date.now() - 2 * DAY_MS },
  { id: 'p5', name: 'Haushalt & Alltag', color: '#8b5cf6', createdAt: Date.now() - 1 * DAY_MS },
];

const seedLogs = (): TimeLog[] => {
  const { todayStartMs, yesterdayStartMs, todayStr, yesterdayStr } = getDaySeeds();

  return [
    {
      id: 'log-1',
      projectId: 'p1',
      startTime: withTime(yesterdayStartMs, 9, 0),
      endTime: withTime(yesterdayStartMs, 10, 30),
      duration: 5100,
      pauseDuration: 300,
      type: 'stopwatch',
      date: yesterdayStr,
    },
    {
      id: 'log-2',
      projectId: 'p2',
      startTime: withTime(yesterdayStartMs, 11, 0),
      endTime: withTime(yesterdayStartMs, 12, 0),
      duration: 3300,
      pauseDuration: 300,
      type: 'pomodoro_work',
      date: yesterdayStr,
    },
    {
      id: 'log-3',
      projectId: 'p2',
      startTime: withTime(yesterdayStartMs, 12, 5),
      endTime: withTime(yesterdayStartMs, 12, 10),
      duration: 300,
      pauseDuration: 0,
      type: 'pomodoro_break',
      date: yesterdayStr,
    },
    {
      id: 'log-4',
      projectId: 'p3',
      startTime: withTime(yesterdayStartMs, 17, 0),
      endTime: withTime(yesterdayStartMs, 18, 0),
      duration: 3600,
      pauseDuration: 0,
      type: 'timer',
      date: yesterdayStr,
    },
    {
      id: 'log-5',
      projectId: 'p1',
      startTime: withTime(todayStartMs, 8, 30),
      endTime: withTime(todayStartMs, 10, 0),
      duration: 5000,
      pauseDuration: 400,
      type: 'stopwatch',
      date: todayStr,
    },
    {
      id: 'log-6',
      projectId: 'p2',
      startTime: withTime(todayStartMs, 10, 30),
      endTime: withTime(todayStartMs, 11, 30),
      duration: 3600,
      pauseDuration: 0,
      type: 'timer',
      date: todayStr,
    },
    {
      id: 'log-7',
      projectId: 'p4',
      startTime: withTime(todayStartMs, 13, 0),
      endTime: withTime(todayStartMs, 13, 42),
      duration: 2520,
      pauseDuration: 0,
      type: 'timer',
      date: todayStr,
    },
    {
      id: 'log-8',
      projectId: 'p1',
      startTime: withTime(todayStartMs, 14, 0),
      endTime: withTime(todayStartMs, 14, 45),
      duration: 2500,
      pauseDuration: 200,
      type: 'pomodoro_work',
      date: todayStr,
    },
  ];
};

const isProject = (value: unknown): value is Project => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Project;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.color === 'string' &&
    typeof candidate.createdAt === 'number'
  );
};

const isSessionType = (value: unknown): value is SessionType => {
  return value === 'stopwatch' || value === 'timer' || value === 'pomodoro_work' || value === 'pomodoro_break';
};

const isTimeLog = (value: unknown): value is TimeLog => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as TimeLog;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.projectId === 'string' &&
    typeof candidate.startTime === 'number' &&
    typeof candidate.endTime === 'number' &&
    typeof candidate.duration === 'number' &&
    typeof candidate.pauseDuration === 'number' &&
    isSessionType(candidate.type) &&
    typeof candidate.date === 'string'
  );
};

const parseProjects = (raw: string | null): Project[] | null => {
  if (raw === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.filter(isProject);
  } catch (error) {
    console.error('Error parsing projects from localStorage', error);
    return null;
  }
};

const parseLogs = (raw: string | null): TimeLog[] | null => {
  if (raw === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.filter(isTimeLog);
  } catch (error) {
    console.error('Error parsing logs from localStorage', error);
    return null;
  }
};

const createId = (prefix: 'proj' | 'log'): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const TimeTrackerContext = createContext<TimeTrackerContextType | undefined>(undefined);

export const TimeTrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [currentProjectId, setCurrentProjectIdState] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedProjects = parseProjects(localStorage.getItem(STORAGE_KEYS.projects));
    const initialProjects = storedProjects ?? DEFAULT_PROJECTS;

    const storedLogs = parseLogs(localStorage.getItem(STORAGE_KEYS.logs));
    const initialLogs = storedLogs ?? seedLogs();

    const storedActiveProject = localStorage.getItem(STORAGE_KEYS.activeProject);

    setProjects(initialProjects);
    setTimeLogs(initialLogs);

    if (storedActiveProject && initialProjects.some((project) => project.id === storedActiveProject)) {
      setCurrentProjectIdState(storedActiveProject);
    } else {
      setCurrentProjectIdState(initialProjects[0]?.id ?? '');
    }

    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
  }, [projects, isInitialized]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(timeLogs));
  }, [timeLogs, isInitialized]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (currentProjectId) {
      localStorage.setItem(STORAGE_KEYS.activeProject, currentProjectId);
      return;
    }

    localStorage.removeItem(STORAGE_KEYS.activeProject);
  }, [currentProjectId, isInitialized]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (projects.length === 0) {
      if (currentProjectId !== '') {
        setCurrentProjectIdState('');
      }
      return;
    }

    const isCurrentProjectValid = projects.some((project) => project.id === currentProjectId);
    if (!isCurrentProjectValid) {
      setCurrentProjectIdState(projects[0].id);
    }
  }, [projects, currentProjectId, isInitialized]);

  const setCurrentProjectId = (id: string) => {
    if (!id || !projects.some((project) => project.id === id)) {
      return;
    }
    setCurrentProjectIdState(id);
  };

  const addProject = (name: string, color: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    const newProject: Project = {
      id: createId('proj'),
      name: trimmedName,
      color,
      createdAt: Date.now(),
    };

    setProjects((prevProjects) => [...prevProjects, newProject]);
    setCurrentProjectIdState((prevCurrentProjectId) => prevCurrentProjectId || newProject.id);
  };

  const editProject = (id: string, name: string, color: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    setProjects((prevProjects) =>
      prevProjects.map((project) =>
        project.id === id
          ? {
              ...project,
              name: trimmedName,
              color,
            }
          : project,
      ),
    );
  };

  const deleteProject = (id: string) => {
    if (!id) {
      return;
    }

    setProjects((prevProjects) => prevProjects.filter((project) => project.id !== id));
    setTimeLogs((prevLogs) => prevLogs.filter((log) => log.projectId !== id));
    setCurrentProjectIdState((prevCurrentProjectId) => (prevCurrentProjectId === id ? '' : prevCurrentProjectId));
  };

  const addTimeLog = (
    projectId: string,
    startTime: number,
    endTime: number,
    duration: number,
    pauseDuration: number,
    type: TimeLog['type'],
  ) => {
    if (!projectId || duration <= 0) {
      return;
    }

    const safeStartTime = Number.isFinite(startTime) ? startTime : Date.now();
    const rawEndTime = Number.isFinite(endTime) ? endTime : Date.now();
    const safeEndTime = Math.max(rawEndTime, safeStartTime);
    const safeDuration = Math.max(0, Math.floor(duration));
    const safePauseDuration = Math.max(0, Math.floor(pauseDuration));

    if (safeDuration === 0) {
      return;
    }

    const dateStr = formatDateStr(new Date(safeEndTime));

    const newLog: TimeLog = {
      id: createId('log'),
      projectId,
      startTime: safeStartTime,
      endTime: safeEndTime,
      duration: safeDuration,
      pauseDuration: safePauseDuration,
      type,
      date: dateStr,
    };

    setTimeLogs((prevLogs) => [newLog, ...prevLogs]);
  };

  const deleteTimeLog = (id: string) => {
    setTimeLogs((prevLogs) => prevLogs.filter((log) => log.id !== id));
  };

  const clearAllLogs = () => {
    setTimeLogs([]);
  };

  return (
    <TimeTrackerContext.Provider
      value={{
        projects,
        timeLogs,
        currentProjectId,
        setCurrentProjectId,
        addProject,
        editProject,
        deleteProject,
        addTimeLog,
        deleteTimeLog,
        clearAllLogs,
      }}
    >
      {children}
    </TimeTrackerContext.Provider>
  );
};

export const useTimeTracker = () => {
  const context = useContext(TimeTrackerContext);
  if (context === undefined) {
    throw new Error('useTimeTracker must be used within a TimeTrackerProvider');
  }
  return context;
};
