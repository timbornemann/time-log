import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, TimeLog } from '../types';

interface TimeTrackerContextType {
  projects: Project[];
  timeLogs: TimeLog[];
  currentProjectId: string;
  setCurrentProjectId: (id: string) => void;
  addProject: (name: string, color: string) => void;
  editProject: (id: string, name: string, color: string) => void;
  deleteProject: (id: string) => void;
  addTimeLog: (projectId: string, startTime: number, endTime: number, duration: number, pauseDuration: number, type: TimeLog['type']) => void;
  deleteTimeLog: (id: string) => void;
  clearAllLogs: () => void;
}

const DEFAULT_PROJECTS: Project[] = [
  { id: 'p1', name: '📚 Studium & Lernen', color: '#3b82f6', createdAt: Date.now() - 5 * 86400000 },
  { id: 'p2', name: '💼 Arbeit & Karriere', color: '#10b981', createdAt: Date.now() - 4 * 86400000 },
  { id: 'p3', name: '🏋️ Sport & Fitness', color: '#ef4444', createdAt: Date.now() - 3 * 86400000 },
  { id: 'p4', name: '🎨 Eigene Projekte', color: '#f59e0b', createdAt: Date.now() - 2 * 86400000 },
  { id: 'p5', name: '🧹 Haushalt & Alltag', color: '#8b5cf6', createdAt: Date.now() - 1 * 86400000 },
];

const getYesterdayAndTodayStrings = () => {
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  
  const formatDateStr = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    todayStr: formatDateStr(today),
    yesterdayStr: formatDateStr(yesterday)
  };
};

const SEED_LOGS = (): TimeLog[] => {
  const { todayStr, yesterdayStr } = getYesterdayAndTodayStrings();
  
  const todayMs = new Date(todayStr).getTime();
  const yesterdayMs = new Date(yesterdayStr).getTime();

  return [
    // Yesterday logs
    {
      id: 'log-1',
      projectId: 'p1',
      startTime: yesterdayMs + 9 * 3600 * 1000, // 09:00 Uhr
      endTime: yesterdayMs + 10.5 * 3600 * 1000, // 10:30 Uhr
      duration: 5400, // 90 min
      pauseDuration: 300, // 5 min
      type: 'stopwatch',
      date: yesterdayStr
    },
    {
      id: 'log-2',
      projectId: 'p2',
      startTime: yesterdayMs + 11 * 3600 * 1000, 
      endTime: yesterdayMs + 12 * 3600 * 1000, 
      duration: 3300, // 55 min
      pauseDuration: 300, // 5 min
      type: 'pomodoro_work',
      date: yesterdayStr
    },
    {
      id: 'log-3',
      projectId: 'p2',
      startTime: yesterdayMs + 12.05 * 3600 * 1000, 
      endTime: yesterdayMs + 12.10 * 3600 * 1000, 
      duration: 300, // 5 min
      pauseDuration: 0, 
      type: 'pomodoro_break',
      date: yesterdayStr
    },
    {
      id: 'log-4',
      projectId: 'p3',
      startTime: yesterdayMs + 17 * 3600 * 1000,
      endTime: yesterdayMs + 18 * 3600 * 1000,
      duration: 3600, // 60 min
      pauseDuration: 0,
      type: 'timer',
      date: yesterdayStr
    },
    
    // Today logs
    {
      id: 'log-5',
      projectId: 'p1',
      startTime: todayMs + 8.5 * 3600 * 1000, // 08:30
      endTime: todayMs + 10 * 3600 * 1000, // 10:00
      duration: 5000, // 83 min (z.B. mit pauses)
      pauseDuration: 400, // 6.6 min
      type: 'stopwatch',
      date: todayStr
    },
    {
      id: 'log-6',
      projectId: 'p2',
      startTime: todayMs + 10.5 * 3600 * 1000, 
      endTime: todayMs + 11.5 * 3600 * 1000, 
      duration: 3600, 
      pauseDuration: 0,
      type: 'timer',
      date: todayStr
    },
    {
      id: 'log-7',
      projectId: 'p4',
      startTime: todayMs + 13 * 3600 * 1000,
      endTime: todayMs + 13.7 * 3600 * 1000,
      duration: 2520, // 42 min
      pauseDuration: 0,
      type: 'timer',
      date: todayStr
    },
    {
      id: 'log-8',
      projectId: 'p1',
      startTime: todayMs + 14 * 3600 * 1000,
      endTime: todayMs + 14.45 * 3600 * 1000,
      duration: 2500, // 41 min
      pauseDuration: 200, // ~3 min
      type: 'pomodoro_work',
      date: todayStr
    }
  ];
};

const TimeTrackerContext = createContext<TimeTrackerContextType | undefined>(undefined);

export const TimeTrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [currentProjectId, setCurrentProjectIdState] = useState<string>('');

  // Initial load
  useEffect(() => {
    const storedProjects = localStorage.getItem('zeitlog_projects');
    const storedLogs = localStorage.getItem('zeitlog_timelogs');
    const storedActiveProject = localStorage.getItem('zeitlog_active_project');

    let initialProjects = DEFAULT_PROJECTS;
    if (storedProjects) {
      try {
        initialProjects = JSON.parse(storedProjects);
      } catch (e) {
        console.error("Error parsing projects from localStorage", e);
      }
    } else {
      localStorage.setItem('zeitlog_projects', JSON.stringify(DEFAULT_PROJECTS));
    }
    setProjects(initialProjects);

    let initialLogs = SEED_LOGS();
    if (storedLogs) {
      try {
        initialLogs = JSON.parse(storedLogs);
      } catch (e) {
        console.error("Error parsing logs from localStorage", e);
      }
    } else {
      localStorage.setItem('zeitlog_timelogs', JSON.stringify(initialLogs));
    }
    setTimeLogs(initialLogs);

    if (storedActiveProject && initialProjects.some(p => p.id === storedActiveProject)) {
      setCurrentProjectIdState(storedActiveProject);
    } else if (initialProjects.length > 0) {
      setCurrentProjectIdState(initialProjects[0].id);
      localStorage.setItem('zeitlog_active_project', initialProjects[0].id);
    }
  }, []);

  const setCurrentProjectId = (id: string) => {
    setCurrentProjectIdState(id);
    localStorage.setItem('zeitlog_active_project', id);
  };

  const addProject = (name: string, color: string) => {
    const newProject: Project = {
      id: 'proj-' + Date.now().toString(36),
      name,
      color,
      createdAt: Date.now(),
    };
    const updated = [...projects, newProject];
    setProjects(updated);
    localStorage.setItem('zeitlog_projects', JSON.stringify(updated));

    // If no active project, set this one
    if (!currentProjectId) {
      setCurrentProjectId(newProject.id);
    }
  };

  const editProject = (id: string, name: string, color: string) => {
    const updated = projects.map(p => p.id === id ? { ...p, name, color } : p);
    setProjects(updated);
    localStorage.setItem('zeitlog_projects', JSON.stringify(updated));
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem('zeitlog_projects', JSON.stringify(updated));

    // Also filter logs or leave them? It's cleaner to remove logs or set project as deleted
    // Let's filter logs as well to avoid referencing non-existing project IDs, or handle it gracefully.
    // Let's keep logs but if project deleted, logs will show "Gelöschtes Projekt". Actually, deleting logs of that project is easiest.
    const updatedLogs = timeLogs.filter(log => log.projectId !== id);
    setTimeLogs(updatedLogs);
    localStorage.setItem('zeitlog_timelogs', JSON.stringify(updatedLogs));

    if (currentProjectId === id) {
      if (updated.length > 0) {
        setCurrentProjectId(updated[0].id);
      } else {
        setCurrentProjectIdState('');
        localStorage.removeItem('zeitlog_active_project');
      }
    }
  };

  const addTimeLog = (
    projectId: string,
    startTime: number,
    endTime: number,
    duration: number,
    pauseDuration: number,
    type: TimeLog['type']
  ) => {
    // Only log if duration is positive
    if (duration <= 0 && pauseDuration <= 0) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const newLog: TimeLog = {
      id: 'log-' + Math.random().toString(36).substr(2, 9),
      projectId,
      startTime,
      endTime,
      duration,
      pauseDuration,
      type,
      date: dateStr,
    };

    const updated = [newLog, ...timeLogs];
    setTimeLogs(updated);
    localStorage.setItem('zeitlog_timelogs', JSON.stringify(updated));
  };

  const deleteTimeLog = (id: string) => {
    const updated = timeLogs.filter(log => log.id !== id);
    setTimeLogs(updated);
    localStorage.setItem('zeitlog_timelogs', JSON.stringify(updated));
  };

  const clearAllLogs = () => {
    setTimeLogs([]);
    localStorage.setItem('zeitlog_timelogs', JSON.stringify([]));
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
