import React, { useState, useEffect, useRef } from 'react';
import { useTimeTracker } from '../context/TimeTrackerContext';
import { Play, Pause, Square, SkipForward, Timer as TimerIcon, Flame, BellRing, X, FolderKanban } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectManager } from './ProjectManager';

// Chime generator using the browser's Web Audio API
const playChime = (type: 'work' | 'break' | 'success') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'work') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.35); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'break') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
      osc.frequency.exponentialRampToValueAtTime(440.00, ctx.currentTime + 0.35); // A4
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
      gain2.gain.setValueAtTime(0.08, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.start();
      osc2.start();
      osc.stop(ctx.currentTime + 0.6);
      osc2.stop(ctx.currentTime + 0.6);
    }
  } catch (error) {
    console.warn("AudioContext is blocked or not supported on this environment.", error);
  }
};

export const TimerEngine: React.FC = () => {
  const { projects, currentProjectId, setCurrentProjectId, addTimeLog } = useTimeTracker();
  
  // Tab states: 'stopwatch' | 'timer' | 'pomodoro'
  const [activeTab, setActiveTab] = useState<'stopwatch' | 'timer' | 'pomodoro'>('stopwatch');

  // Running State
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Realtime timestamps for accurate tracking
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  
  // Elapsed timers
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pauseSeconds, setPauseSeconds] = useState(0);

  // Internal refs for precise elapsed/pause tracking
  const sessionStartRef = useRef<number | null>(null);
  const pausedTotalMsRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  const lastElapsedSecondRef = useRef(0);
  const lastPauseSecondRef = useRef(0);

  // Countdown Config states
  const [cfgMinutes, setCfgMinutes] = useState(25);
  const [cfgSeconds, setCfgSeconds] = useState(0);
  
  // Pomodoro Config states
  const [pomoWorkMin, setPomoWorkMin] = useState(25);
  const [pomoBreakMin, setPomoBreakMin] = useState(5);
  const [pomoPhase, setPomoPhase] = useState<'work' | 'break'>('work');
  const [pomoCycle, setPomoCycle] = useState(1);

  // Setup refs for accurate interval loop
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedProject = projects.find(p => p.id === currentProjectId);

  // Sound notification option
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  // Project Manager Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Format utility
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Pre-configured chips triggers
  const setCountdownPreset = (mins: number) => {
    if (isRunning) return;
    setCfgMinutes(mins);
    setCfgSeconds(0);
  };

  const setPomoPreset = (work: number, breakM: number) => {
    if (isRunning) return;
    setPomoWorkMin(work);
    setPomoBreakMin(breakM);
  };

  const getSessionSnapshot = (now = Date.now()) => {
    const sessionStart = sessionStartRef.current ?? sessionStartTime ?? now;
    const livePauseMs = isPaused && pauseStartRef.current !== null ? now - pauseStartRef.current : 0;
    const totalPauseMs = pausedTotalMsRef.current + Math.max(livePauseMs, 0);
    const activeMs = Math.max(0, now - sessionStart - totalPauseMs);

    return {
      sessionStart,
      now,
      elapsedSeconds: Math.floor(activeMs / 1000),
      pauseSeconds: Math.floor(totalPauseMs / 1000),
    };
  };

  const resetSessionState = () => {
    sessionStartRef.current = null;
    pausedTotalMsRef.current = 0;
    pauseStartRef.current = null;
    lastElapsedSecondRef.current = 0;
    lastPauseSecondRef.current = 0;

    setElapsedSeconds(0);
    setPauseSeconds(0);
    setSessionStartTime(null);
  };

  const startFreshSession = (startAt = Date.now()) => {
    sessionStartRef.current = startAt;
    pausedTotalMsRef.current = 0;
    pauseStartRef.current = null;
    lastElapsedSecondRef.current = 0;
    lastPauseSecondRef.current = 0;

    setSessionStartTime(startAt);
    setElapsedSeconds(0);
    setPauseSeconds(0);
  };

  // Timer Ticking Interval Hook
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const syncSessionState = () => {
      const snapshot = getSessionSnapshot();

      if (snapshot.elapsedSeconds !== lastElapsedSecondRef.current) {
        lastElapsedSecondRef.current = snapshot.elapsedSeconds;
        setElapsedSeconds(snapshot.elapsedSeconds);
      }

      if (snapshot.pauseSeconds !== lastPauseSecondRef.current) {
        lastPauseSecondRef.current = snapshot.pauseSeconds;
        setPauseSeconds(snapshot.pauseSeconds);
      }
    };

    syncSessionState();
    intervalRef.current = setInterval(syncSessionState, 200);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused, sessionStartTime]);

  // Handle automatic phase transitions / countdown timer finish
  useEffect(() => {
    if (!isRunning || isPaused) return;

    if (activeTab === 'timer') {
      const targetSeconds = cfgMinutes * 60 + cfgSeconds;
      if (targetSeconds > 0 && elapsedSeconds >= targetSeconds) {
        handleFinishTimer();
      }
    } else if (activeTab === 'pomodoro') {
      const targetSeconds = (pomoPhase === 'work' ? pomoWorkMin : pomoBreakMin) * 60;
      if (targetSeconds > 0 && elapsedSeconds >= targetSeconds) {
        handleFinishPomodoroPhase({ logCompletedDuration: true });
      }
    }
  }, [elapsedSeconds, isRunning, isPaused, activeTab, pomoPhase, pomoWorkMin, pomoBreakMin, cfgMinutes, cfgSeconds]);

  // Handle Event: Timer countdown finished fully
  const handleFinishTimer = () => {
    const targetDuration = cfgMinutes * 60 + cfgSeconds;
    if (targetDuration <= 0) {
      handleStop(false);
      return;
    }

    const snapshot = getSessionSnapshot();
    setIsRunning(false);
    setIsPaused(false);

    if (currentProjectId) {
      addTimeLog(
        currentProjectId,
        snapshot.sessionStart,
        snapshot.now,
        targetDuration,
        snapshot.pauseSeconds,
        'timer'
      );
    }

    if (isSoundEnabled) {
      playChime('success');
    }

    resetSessionState();
  };

  // Handle Event: Switch between Pomodoro Work and break cycles
  const handleFinishPomodoroPhase = (options: { logCompletedDuration: boolean }) => {
    const completedDuration = (pomoPhase === 'work' ? pomoWorkMin : pomoBreakMin) * 60;
    const logType: 'pomodoro_work' | 'pomodoro_break' = pomoPhase === 'work' ? 'pomodoro_work' : 'pomodoro_break';
    const snapshot = getSessionSnapshot();
    const loggedDuration = options.logCompletedDuration ? completedDuration : snapshot.elapsedSeconds;

    if (currentProjectId && loggedDuration > 0) {
      addTimeLog(
        currentProjectId,
        snapshot.sessionStart,
        snapshot.now,
        loggedDuration,
        snapshot.pauseSeconds,
        logType
      );
    }

    if (isSoundEnabled) {
      playChime(pomoPhase === 'work' ? 'break' : 'work');
    }

    const nextPhase = pomoPhase === 'work' ? 'break' : 'work';
    if (pomoPhase === 'break') {
      setPomoCycle(prev => prev + 1);
    }

    const restartAt = Date.now();
    setPomoPhase(nextPhase);
    setIsPaused(false);
    startFreshSession(restartAt);
  };

  // Button Action: Start Timer
  const handleStart = () => {
    if (!currentProjectId) {
      alert('Bitte waehle oder erstelle zuerst ein Projekt fuer die Zeiterfassung.');
      return;
    }

    if (activeTab === 'timer' && cfgMinutes * 60 + cfgSeconds <= 0) {
      alert('Bitte stelle fuer den Countdown mindestens 1 Sekunde ein.');
      return;
    }

    if (isPaused) {
      const pauseStart = pauseStartRef.current;
      if (pauseStart !== null) {
        pausedTotalMsRef.current += Date.now() - pauseStart;
      }
      pauseStartRef.current = null;
      setIsPaused(false);
      return;
    }

    const startAt = Date.now();
    startFreshSession(startAt);
    setIsRunning(true);
    setIsPaused(false);

    if (isSoundEnabled) {
      playChime('work');
    }
  };

  // Button Action: Toggle Pause
  const handlePauseToggle = () => {
    if (!isRunning) return;

    if (isPaused) {
      const pauseStart = pauseStartRef.current;
      if (pauseStart !== null) {
        pausedTotalMsRef.current += Date.now() - pauseStart;
      }
      pauseStartRef.current = null;
      setIsPaused(false);
    } else {
      pauseStartRef.current = Date.now();
      setIsPaused(true);
    }
  };

  // Button Action: Stop & Save (Or abort) stopwatch
  const handleStop = (saveLog: boolean = true) => {
    if (!isRunning) return;

    const snapshot = getSessionSnapshot();
    setIsRunning(false);
    setIsPaused(false);

    if (saveLog && currentProjectId && snapshot.elapsedSeconds > 0) {
      let type: 'stopwatch' | 'timer' | 'pomodoro_work' | 'pomodoro_break' = 'stopwatch';
      if (activeTab === 'timer') type = 'timer';
      if (activeTab === 'pomodoro') {
        type = pomoPhase === 'work' ? 'pomodoro_work' : 'pomodoro_break';
      }

      addTimeLog(
        currentProjectId,
        snapshot.sessionStart,
        snapshot.now,
        snapshot.elapsedSeconds,
        snapshot.pauseSeconds,
        type
      );

      if (isSoundEnabled) {
        playChime('success');
      }
    }

    resetSessionState();
  };

  // Button Action: Skip or reset Pomodoro Phase manually
  const handleSkipPomodoro = () => {
    if (activeTab !== 'pomodoro' || !isRunning) return;

    const snapshot = getSessionSnapshot();
    const shouldLogPartial = window.confirm(
      `Moechtest du die bisherigen ${formatTime(snapshot.elapsedSeconds)} dieser Pomodoro-Phase (${pomoPhase === 'work' ? 'Arbeit' : 'Pause'}) loggen?`
    );

    if (shouldLogPartial) {
      handleFinishPomodoroPhase({ logCompletedDuration: false });
      return;
    }

    const nextPhase = pomoPhase === 'work' ? 'break' : 'work';
    if (pomoPhase === 'break') {
      setPomoCycle((prev) => prev + 1);
    }

    const restartAt = Date.now();
    setPomoPhase(nextPhase);
    setIsPaused(false);
    startFreshSession(restartAt);
  };

  // Calculate Progress Percentages for Circles
  const getProgressPercent = () => {
    if (!isRunning) return 0;
    if (activeTab === 'stopwatch') return 100; // Stopwatch climbs indefinitely, standard sweep
    
    if (activeTab === 'timer') {
      const target = cfgMinutes * 60 + cfgSeconds;
      if (target <= 0) return 0;
      return Math.min((elapsedSeconds / target) * 100, 100);
    }
    
    if (activeTab === 'pomodoro') {
      const target = (pomoPhase === 'work' ? pomoWorkMin : pomoBreakMin) * 60;
      if (target <= 0) return 0;
      return Math.min((elapsedSeconds / target) * 100, 100);
    }
    return 0;
  };

  const getRemainingTime = () => {
    if (activeTab === 'stopwatch') return elapsedSeconds;
    
    if (activeTab === 'timer') {
      const target = cfgMinutes * 60 + cfgSeconds;
      return Math.max(target - elapsedSeconds, 0);
    }
    
    if (activeTab === 'pomodoro') {
      const target = (pomoPhase === 'work' ? pomoWorkMin : pomoBreakMin) * 60;
      return Math.max(target - elapsedSeconds, 0);
    }
    return 0;
  };

  const progressPercent = getProgressPercent();
  const displaySeconds = getRemainingTime();

  // SVG ring attributes
  const radius = 120;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  // If countdown timer, fill ring downwards from full
  const strokeDashoffset = activeTab === 'stopwatch' 
    ? 0 
    : circumference - (progressPercent / 100) * circumference;

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return (
    <div id="countdown-timer-widget" className="bg-white rounded-3xl border border-brand-border p-8 shadow-sm text-center flex flex-col justify-between h-full min-h-[580px]">
      
      {/* Upper Area: Project Selection & Sound Switch */}
      <div id="timer-header" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-text-muted font-bold tracking-wider uppercase">
            <TimerIcon id="sound-options-icon" size={14} className="text-brand-sage" />
            <span>Fokus-Sitzung</span>
          </div>
          <button
            id="btn-toggle-sound"
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
              isSoundEnabled 
                ? 'bg-brand-sage-light text-brand-sage-dark border border-[#D0D4C2]' 
                : 'bg-brand-sand text-text-muted border border-brand-border'
            }`}
          >
            <BellRing size={10} />
            {isSoundEnabled ? 'TOENE AN' : 'STUMM'}
          </button>
        </div>

        {/* Unified Project Dropdown Category Selector */}
        <div id="project-combo-wrapper" className="relative">
          {projects.length === 0 ? (
            <div className="flex items-center gap-2">
              <div className="p-3.5 text-xs text-brand-terracotta bg-brand-sand border border-[#DED9D0] rounded-2xl italic font-serif flex-1 text-left">
                Lege ein Projekt an, um Zeit zu loggen!
              </div>
              <button
                type="button"
                id="btn-open-projects-empty"
                onClick={() => setIsProjectModalOpen(true)}
                className="p-3.5 bg-brand-sand/50 hover:bg-brand-sand border border-[#DED9D0] rounded-2xl text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-sm flex items-center justify-center shrink-0"
                title="Projekte & Themen verwalten"
              >
                <FolderKanban size={16} className="text-brand-sage" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <span className="absolute left-4 w-3.5 h-3.5 rounded-full" style={{ backgroundColor: selectedProject?.color || '#9ca3af' }} />
                <select
                  id="select-active-project"
                  value={currentProjectId}
                  onChange={(e) => setCurrentProjectId(e.target.value)}
                  disabled={isRunning}
                  className="w-full pl-10 pr-4 py-3.5 bg-brand-sand/50 hover:bg-brand-sand border border-[#DED9D0] rounded-2xl text-xs font-bold text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-sage/20 focus:border-brand-sage transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed uppercase tracking-wider shadow-sm"
                >
                  {projects.map((p) => (
                    <option id={`option-${p.id}`} key={p.id} value={p.id} className="text-text-primary capitalize bg-white font-sans text-xs">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                id="btn-open-projects-loaded"
                onClick={() => setIsProjectModalOpen(true)}
                className="p-3.5 bg-brand-sand/50 hover:bg-brand-sand border border-[#DED9D0] rounded-2xl text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-sm flex items-center justify-center shrink-0 h-[46px]"
                title="Projekte & Themen verwalten"
              >
                <FolderKanban size={16} className="text-brand-sage" />
              </button>
            </div>
          )}
        </div>

        {/* Tab Selection matching Natural Tones layout */}
        <div id="mode-tabs" className="grid grid-cols-3 gap-1 p-1 bg-brand-sand rounded-xl border border-brand-border/40">
          {(['stopwatch', 'timer', 'pomodoro'] as const).map((tab) => {
            const isSelected = activeTab === tab;
            let label = 'Stoppuhr';
            if (tab === 'timer') label = 'Countdown';
            if (tab === 'pomodoro') label = 'Pomodoro';

            return (
              <button
                id={`tab-mode-${tab}`}
                key={tab}
                disabled={isRunning}
                onClick={() => {
                  setActiveTab(tab);
                  resetSessionState();
                  if (tab === 'pomodoro') {
                    setPomoPhase('work');
                    setPomoCycle(1);
                  }
                }}
                className={`py-2 text-xs font-semibold tracking-wide rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSelected
                    ? 'bg-white text-text-primary shadow-sm border border-brand-border/30 font-bold'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/30'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Middle Area: Circle Display */}
      <div id="timer-clock-display" className="relative flex items-center justify-center my-6">
        
        {/* Animated Visual Pulsing Ring in Behind */}
        {isRunning && !isPaused && (
          <div 
            className="absolute rounded-full pulse-ring-active" 
            style={{
              width: `${(radius + 15) * 2}px`,
              height: `${(radius + 15) * 2}px`,
              borderWidth: '1.5px',
              borderColor: selectedProject?.color ? `${selectedProject.color}1e` : '#8C94721e',
              backgroundColor: selectedProject?.color ? `${selectedProject.color}04` : '#8C947204',
            }}
          />
        )}

        <svg width="270" height="270" viewBox="0 0 280 280" className="-rotate-90">
          {/* Background Ring Track */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="transparent"
            stroke="#F5F2ED"
            strokeWidth={strokeWidth}
          />
          {/* Foreground Colored Active Stroke */}
          <motion.circle
            cx="140"
            cy="140"
            r={radius}
            fill="transparent"
            stroke={selectedProject?.color || '#8C9472'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.35, ease: "linear" }}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Clock Labels */}
        <div id="center-readout" className="absolute inset-x-0 mx-auto flex flex-col items-center justify-center max-w-[210px]">
          <span id="center-badge" className="text-[10px] font-bold tracking-[0.25em] text-text-muted uppercase mb-1">
            {activeTab === 'stopwatch' && 'STOPPING'}
            {activeTab === 'timer' && 'VERBLEIBEND'}
            {activeTab === 'pomodoro' && `${pomoPhase === 'work' ? 'ARBEIT' : 'PAUSE'}`}
          </span>

          <span 
            id="center-timer" 
            className="text-4xl sm:text-5xl font-mono font-light tracking-tighter text-text-primary leading-none select-none tabular-nums"
          >
            {formatTime(displaySeconds)}
          </span>

          {currentProjectId && (
            <span id="active-project-tag" className="text-xs font-semibold text-text-secondary mt-2.5 truncate max-w-full underline underline-offset-4 decoration-brand-sage/60">
              {selectedProject?.name || 'Kein Projekt'}
            </span>
          )}

          {/* Pause Stats overlay */}
          <AnimatePresence>
            {pauseSeconds > 0 && (
              <motion.div
                id="pause-hud"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-3 flex items-center gap-1.5 px-3 py-1 bg-brand-sand rounded-xl border border-brand-border"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-brand-terracotta animate-pulse" />
                <span className="text-[10px] font-bold text-brand-terracotta font-mono">
                  Pause: {formatTime(pauseSeconds)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'pomodoro' && (
            <span id="pomo-cycle-hud" className="text-[10px] text-text-muted mt-1 font-semibold tracking-wider">
              Zyklus: #{pomoCycle}
            </span>
          )}
        </div>
      </div>

      {/* Inputs panel / Setup presets (When timer is NOT running) */}
      <div id="timer-config-panel" className="h-[90px] mb-4 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!isRunning ? (
            <motion.div
              id="presets-display"
              key="config-active"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              {activeTab === 'timer' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">MIN</span>
                      <input
                        id="input-timer-mins"
                        type="number"
                        min="0"
                        max="180"
                        value={cfgMinutes}
                        onChange={(e) => setCfgMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-14 text-center text-xs font-bold py-1 bg-brand-sand border border-[#DED9D0] rounded-lg text-text-primary"
                      />
                    </div>
                    <span className="text-text-muted pt-3 font-semibold">:</span>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">SEK</span>
                      <input
                        id="input-timer-secs"
                        type="number"
                        min="0"
                        max="59"
                        value={cfgSeconds}
                        onChange={(e) => setCfgSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-14 text-center text-xs font-bold py-1 bg-brand-sand border border-[#DED9D0] rounded-lg text-text-primary"
                      />
                    </div>
                  </div>
                  
                  {/* Presets chips */}
                  <div className="flex justify-center gap-1.5 overflow-x-auto py-1">
                    {[5, 10, 25, 45, 60].map((m) => (
                      <button
                        id={`btn-preset-timer-${m}`}
                        key={m}
                        onClick={() => setCountdownPreset(m)}
                        className={`text-[11px] font-semibold px-3 py-1 rounded-lg border transition cursor-pointer ${
                          cfgMinutes === m && cfgSeconds === 0
                            ? 'bg-brand-sage border-brand-sage text-white shadow-sm'
                            : 'bg-white border-brand-border text-text-secondary hover:bg-brand-sand'
                        }`}
                      >
                        {m} Min
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'pomodoro' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Arbeit:</span>
                      <input
                        id="input-pomo-work"
                        type="number"
                        min="1"
                        max="120"
                        value={pomoWorkMin}
                        onChange={(e) => setPomoWorkMin(Math.max(1, parseInt(e.target.value) || 25))}
                        className="w-12 text-center text-xs font-bold py-1 bg-brand-sand border border-[#DED9D0] rounded-lg text-text-primary"
                      />
                      <span className="text-[11px] font-medium text-text-secondary">Min</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Pause:</span>
                      <input
                        id="input-pomo-break"
                        type="number"
                        min="1"
                        max="60"
                        value={pomoBreakMin}
                        onChange={(e) => setPomoBreakMin(Math.max(1, parseInt(e.target.value) || 5))}
                        className="w-12 text-center text-xs font-bold py-1 bg-brand-sand border border-[#DED9D0] rounded-lg text-text-primary"
                      />
                      <span className="text-[11px] font-medium text-text-secondary">Min</span>
                    </div>
                  </div>

                  {/* Presets Chips */}
                  <div className="flex justify-center gap-1.5 overflow-x-auto py-1">
                    {[
                      { l: 'Klassisch (25/5)', w: 25, b: 5 },
                      { l: 'Fokus (50/10)', w: 50, b: 10 },
                      { l: 'Power (15/3)', w: 15, b: 3 }
                    ].map((p) => (
                      <button
                        id={`btn-preset-pomo-${p.w}`}
                        key={p.w}
                        onClick={() => setPomoPreset(p.w, p.b)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                          pomoWorkMin === p.w && pomoBreakMin === p.b
                            ? 'bg-brand-sage border-brand-sage text-white shadow-sm'
                            : 'bg-white border-brand-border text-text-secondary hover:bg-brand-sand'
                        }`}
                      >
                        {p.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'stopwatch' && (
                <div className="flex flex-col items-center justify-center text-xs text-text-muted px-4 leading-relaxed font-sans">
                  <p>Mit der Stoppuhr zaehlst du deine Zeit linear hoch. Bei Pausen wird deine Pausenzeit separat fuer deinen Bericht gemessen.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              id="active-timer-hud"
              key="config-running"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex justify-center flex-col items-center"
            >
              <div id="countdown-status" className="text-xs text-text-secondary font-medium">
                {activeTab === 'stopwatch' && 'Messung laeuft...'}
                {activeTab === 'timer' && 'Countdown laeuft...'}
                {activeTab === 'pomodoro' && (
                  <div className="flex items-center gap-1.5 bg-brand-sage-light text-brand-sage-dark px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-[#D0D4C2]">
                    <Flame size={12} className="animate-pulse text-brand-sage-dark" />
                    {pomoPhase === 'work' ? 'Arbeitsphase' : 'Pause'}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-text-muted mt-1 font-semibold italic">
                {isPaused ? 'Aktuell pausiert' : 'Zeiterfassung ist aktiv'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Area: Controls Button Pack */}
      <div id="controls-panel" className="flex items-center justify-center gap-6">
        
        {/* Play/Pause Button */}
        {!isRunning ? (
          <button
            id="btn-play-timer"
            onClick={handleStart}
            disabled={projects.length === 0}
            className="w-18 h-18 rounded-full bg-brand-sage hover:bg-brand-sage-dark text-white flex items-center justify-center shadow-lg shadow-brand-sage/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Sitzung starten"
          >
            <Play size={26} fill="currentColor" className="ml-1" />
          </button>
        ) : (
          <>
            {/* Abandon without logging */}
            <button
              id="btn-abort-timer"
              onClick={() => {
                if (window.confirm('Moechtest du diese aktive Zeiterfassung verwerfen ohne sie zu loggen?')) {
                  handleStop(false);
                }
              }}
              className="w-14 h-14 rounded-full border border-brand-border hover:bg-brand-sand text-text-muted flex items-center justify-center transition-all cursor-pointer shadow-sm"
              title="Sitzung verwerfen"
            >
              <X size={18} />
            </button>

            {/* Hold / Pause - Uses sage or terracotta */}
            <button
              id="btn-pause-resume"
              onClick={handlePauseToggle}
              className={`w-18 h-18 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                isPaused 
                  ? 'bg-brand-sage hover:bg-brand-sage-dark text-white shadow-brand-sage/20' 
                  : 'bg-brand-terracotta hover:bg-[#B36219] text-white shadow-brand-terracotta/25'
              }`}
              title={isPaused ? "Fortsetzen" : "Pause einlegen"}
            >
              {isPaused ? <Play size={26} fill="currentColor" className="ml-1" /> : <Pause size={26} fill="currentColor" />}
            </button>

            {/* Save & Stop - Uses terracotta/wood-red */}
            <button
              id="btn-stop-save"
              onClick={() => handleStop(true)}
              className="w-14 h-14 rounded-full bg-[#C2594D] hover:bg-[#A54B3E] text-white flex items-center justify-center shadow-md shadow-[#C2594D]/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Beenden & Speichern"
            >
              <Square size={18} fill="currentColor" />
            </button>

            {/* Pomodoro Skip Phase Button */}
            {activeTab === 'pomodoro' && (
              <button
                id="btn-pomo-skip"
                onClick={handleSkipPomodoro}
                className="w-12 h-12 rounded-full border border-brand-border hover:bg-brand-sand text-text-muted flex items-center justify-center transition-all cursor-pointer shadow-sm"
                title="Phase ueberspringen"
              >
                <SkipForward size={16} />
              </button>
            )}
          </>
        )}
      </div>

      <ProjectManager isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} />
    </div>
  );
};

