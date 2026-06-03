import React, { useState } from 'react';
import { useTimeTracker } from '../context/TimeTrackerContext';
import { BarChart3, Clock, Trash2, Calendar, Coffee, Sparkles, FolderDot, Grid3X3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const StatsDashboard: React.FC = () => {
  const { timeLogs, projects, deleteTimeLog, clearAllLogs } = useTimeTracker();
  
  // Filter state: 'today' | 'yesterday' | 'all'
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'all'>('today');

  // Format date helper
  const getFilterDateStr = (daysAgo: number) => {
    const d = new Date(Date.now() - daysAgo * 86400000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getFilterDateStr(0);
  const yesterdayStr = getFilterDateStr(1);

  // Filter logs based on date choice
  const filteredLogs = timeLogs.filter((log) => {
    if (dateFilter === 'today') return log.date === todayStr;
    if (dateFilter === 'yesterday') return log.date === yesterdayStr;
    return true; // All
  });

  // Calculate high-level summary stats
  const totalActiveSeconds = filteredLogs.reduce((acc, log) => acc + log.duration, 0);
  const totalPauseSeconds = filteredLogs.reduce((acc, log) => acc + log.pauseDuration, 0);

  const formatHoursAndMinsStr = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hrs > 0) {
      return `${hrs} Std. ${mins} Min.`;
    }
    return `${mins} Min.`;
  };

  const formatTimeStr = (timestamp: number) => {
    const d = new Date(timestamp);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Group durations by project
  const projectStats = filteredLogs.reduce((acc, log) => {
    acc[log.projectId] = (acc[log.projectId] || 0) + log.duration;
    return acc;
  }, {} as Record<string, number>);

  // Build array of stats for display with percentage share
  const projectBreakdown = Object.entries(projectStats)
    .map(([pId, durationSecs]) => {
      const durationVal = durationSecs as number;
      const proj = projects.find((p) => p.id === pId) || {
        id: pId,
        name: 'Gelöschtes Projekt',
        color: '#9ca3af',
      };
      const percentage = totalActiveSeconds > 0 ? (durationVal / totalActiveSeconds) * 100 : 0;
      return {
        ...proj,
        duration: durationVal,
        percentage,
      };
    })
    .sort((a, b) => b.duration - a.duration);

  // Find most focused project
  const favoriteProject = projectBreakdown[0]?.name || 'Keine Erfassung';

  // SVG Circular Donut Chart Math
  const donutRadius = 60;
  const strokeWidth = 14;
  const donutCircumference = 2 * Math.PI * donutRadius; // ~376.99
  
  // Calculate segments
  let accumulatedPercent = 0;
  const donutSegments = projectBreakdown.map((item) => {
    const strokeDashoffset = donutCircumference - (item.percentage / 100) * donutCircumference;
    const rotation = (accumulatedPercent / 100) * 360 - 90;
    accumulatedPercent += item.percentage;
    return {
      ...item,
      strokeDashoffset,
      rotation,
    };
  });

  return (
    <div id="stats-dashboard" className="bg-white rounded-3xl border border-brand-border p-8 shadow-sm space-y-8">
      
      {/* Upper Panel: Header & Date Filter Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-sage-light text-brand-sage-dark rounded-xl">
            <BarChart3 id="stats-icon" size={20} />
          </div>
          <div>
            <h2 id="stats-title" className="font-serif italic text-text-primary text-xl leading-snug">Produktivitäts-Analyse</h2>
            <p id="stats-desc" className="text-xs text-text-muted">Auswertung deiner aktiven Phasen</p>
          </div>
        </div>

        {/* Date Selector Pills */}
        <div id="report-period-pills" className="flex bg-brand-sand p-1 rounded-xl shrink-0 self-start md:self-center border border-brand-border/70">
          {[
            { id: 'today', label: 'Heute' },
            { id: 'yesterday', label: 'Gestern' },
            { id: 'all', label: 'Gesamtverlauf' },
          ].map((item) => (
            <button
              id={`btn-filter-${item.id}`}
              key={item.id}
              onClick={() => setDateFilter(item.id as any)}
              className={`px-4 py-1.8 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                dateFilter === item.id
                  ? 'bg-white text-text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Micro KPI Statistics Cards in Natural Tones theme */}
      <div id="stats-kpi-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Active Focus (Warm Sage tones) */}
        <div id="kpi-card-focus" className="bg-brand-sand/60 p-4.5 rounded-2xl border border-brand-border">
          <div className="flex items-center justify-between text-brand-sage-dark mb-2">
            <Clock size={16} className="text-brand-sage" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-brand-sage-dark">Fokus-Zeit</span>
          </div>
          <p id="calc-active-time" className="text-xl font-bold font-mono text-text-primary tabular-nums">
            {formatHoursAndMinsStr(totalActiveSeconds)}
          </p>
          <p className="text-[10px] text-text-muted mt-1 leading-normal">Aktive Arbeitszeit</p>
        </div>

        {/* KPI 2: Regenerative Pauses (Ocher/Terracotta accent) */}
        <div id="kpi-card-breaks" className="bg-brand-sand/40 p-4.5 rounded-2xl border border-brand-border/70">
          <div className="flex items-center justify-between text-brand-terracotta mb-2">
            <Coffee size={16} className="text-brand-terracotta" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-brand-terracotta/90">Pausen-Zeit</span>
          </div>
          <p id="calc-pause-time" className="text-xl font-bold font-mono text-text-primary tabular-nums">
            {formatHoursAndMinsStr(totalPauseSeconds)}
          </p>
          <p className="text-[10px] text-text-muted mt-1 leading-normal">Erholung und Breaks</p>
        </div>

        {/* KPI 3: Favorite Project (Earthy Brown taupe) */}
        <div id="kpi-card-favorite" className="bg-brand-sand/20 p-4.5 rounded-2xl border border-brand-border/50">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <FolderDot size={16} className="text-[#9B7E6B]" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-text-muted">Hauptfokus</span>
          </div>
          <p id="calc-major-project" className="text-sm font-semibold text-text-primary truncate leading-snug">
            {favoriteProject}
          </p>
          <p className="text-[10px] text-text-muted mt-2.5 leading-normal">Meist gewähltes Thema</p>
        </div>

        {/* KPI 4: Sessions Count (Cream Clean badge) */}
        <div id="kpi-card-count" className="bg-white p-4.5 rounded-2xl border border-brand-border shadow-2xs">
          <div className="flex items-center justify-between text-text-primary mb-2">
            <Sparkles size={16} className="text-brand-sage-dark" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-text-muted">Sitzungen</span>
          </div>
          <p id="calc-sessions-count" className="text-xl font-bold font-mono text-text-primary">
            {filteredLogs.length}
          </p>
          <p className="text-[10px] text-text-muted mt-1 leading-normal">Abgeschlossene Intervalle</p>
        </div>
      </div>

      {/* Main Analysis Block: Splitted into Visualization and Project Breakdown Table */}
      {filteredLogs.length === 0 ? (
        <div id="empty-state-stats" className="text-center py-12 border border-dashed border-brand-border rounded-3xl">
          <p className="text-text-muted text-sm">Keine Daten für diesen Zeitraum vorhanden.</p>
          <p className="text-xs text-text-muted mt-1.5">Starte den Timer, um erste Intervalle aufzuzeichnen!</p>
        </div>
      ) : (
        <div id="stats-insights-section" className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Circular Segment Donut chart (6 Columns on medium screens) */}
          <div id="donut-chart-container" className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-brand-sand/30 rounded-3xl border border-brand-border/40 h-full min-h-[240px]">
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Projekt-Aufteilung</span>
            
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg width="144" height="144" viewBox="0 0 144 144">
                <circle
                  cx="72"
                  cy="72"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#F5F2ED"
                  strokeWidth={strokeWidth}
                />
                {donutSegments.map((segment) => (
                  <circle
                    key={segment.id}
                    cx="72"
                    cy="72"
                    r={donutRadius}
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={donutCircumference}
                    strokeDashoffset={segment.strokeDashoffset}
                    transform={`rotate(${segment.rotation} 72 72)`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                ))}
              </svg>
              <div className="absolute text-center flex flex-col justify-center">
                <span className="text-2.5xl font-mono tracking-tighter text-text-primary font-light">
                  {filteredLogs.length}
                </span>
                <span className="text-[8px] font-bold text-text-muted tracking-wider uppercase">Logs</span>
              </div>
            </div>
          </div>

          {/* List Breakdown Table (7 Columns) */}
          <div id="breakdown-details" className="md:col-span-7 space-y-4 self-center">
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Projekt-Anteile</span>
            <div className="space-y-3.5 max-h-[210px] overflow-y-auto pr-1">
              {projectBreakdown.map((item) => (
                <div id={`breakdown-row-${item.id}`} key={item.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-text-primary capitalize">{item.name}</span>
                    </div>
                    <div className="flex gap-2 text-text-secondary font-mono">
                      <span>{formatHoursAndMinsStr(item.duration)}</span>
                      <span className="text-text-muted">({Math.round(item.percentage)}%)</span>
                    </div>
                  </div>
                  {/* Visual Bar progress track */}
                  <div className="w-full bg-brand-sand h-2 rounded-full overflow-hidden border border-brand-border/40">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: item.color,
                        width: `${item.percentage}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Visual Timeline of Productive Blocks ("Tagesende Auswertung") */}
      {filteredLogs.length > 0 && (
        <div id="daily-timeline-block" className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-brand-sage-dark uppercase tracking-widest flex items-center gap-1.5 font-sans">
              <Grid3X3 size={14} className="text-brand-sage" />
              Chronologischer Tagesverlauf
            </h3>
            <span className="text-[10px] text-text-muted font-bold font-mono leading-none">08:00 - 22:00 Uhr</span>
          </div>

          <div className="p-5 bg-brand-sand/35 rounded-3xl border border-brand-border space-y-4">
            {/* Horizontal Continuous Hour-Bar Track */}
            <div id="interactive-timeline-gantt" className="relative h-11 w-full bg-brand-sand/70 rounded-xl flex overflow-hidden border border-brand-border/75">
              
              {/* Hour Guides inside track */}
              {Array.from({ length: 15 }).map((_, i) => {
                const hour = 8 + i; // 08:00 to 22:00
                const percentLeft = (i / 14) * 100;
                return (
                  <div
                    key={hour}
                    className="absolute h-full border-l border-brand-border-dark/40 flex flex-col justify-end pb-1.5 pl-1.5"
                    style={{ left: `${percentLeft}%` }}
                  >
                    <span className="text-[8px] font-mono text-text-muted select-none font-semibold">
                      {String(hour).padStart(2, '0')}
                    </span>
                  </div>
                );
              })}

              {/* Log sessions mapped over hours */}
              {filteredLogs.map((log) => {
                const proj = projects.find(p => p.id === log.projectId);
                const logColor = proj?.color || '#9ca3af';

                // Map start/end time relative to 08:00 (base = 8 Uhr) and 22:00 (limit = 22 Uhr)
                const timelineStartHour = 8;
                const timelineEndHour = 22;

                const logStart = new Date(log.startTime);
                const logEnd = new Date(log.endTime);

                const startHoursDecimal = logStart.getHours() + logStart.getMinutes() / 60;
                const endHoursDecimal = logEnd.getHours() + logEnd.getMinutes() / 60;

                // Restrict into timeline boundaries
                const boundedStart = Math.max(timelineStartHour, Math.min(timelineEndHour, startHoursDecimal));
                const boundedEnd = Math.max(timelineStartHour, Math.min(timelineEndHour, endHoursDecimal));

                const spanValue = timelineEndHour - timelineStartHour; // 14 hours total
                const leftPercent = ((boundedStart - timelineStartHour) / spanValue) * 100;
                const widthPercent = ((boundedEnd - boundedStart) / spanValue) * 100;

                // Only show block if there is a visible width
                if (widthPercent <= 0) return null;

                return (
                  <div
                    id={`timeline-span-log-${log.id}`}
                    key={log.id}
                    title={`${proj?.name || 'Unbekannt'}: ${formatTimeStr(log.startTime)} - ${formatTimeStr(log.endTime)} (${formatHoursAndMinsStr(log.duration)})`}
                    className="absolute top-2 bottom-2 rounded-lg opacity-90 hover:opacity-100 transition-all cursor-pointer shadow-xs flex items-center justify-center"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${Math.max(widthPercent, 1.2)}%`, // min width so tiny sessions are visible
                      backgroundColor: logColor,
                      border: '1.2px solid rgba(255, 255, 255, 0.45)'
                    }}
                  >
                    {widthPercent > 5 && (
                      <span className="text-[8px] font-bold text-white tracking-tighter truncate px-1.5 font-mono">
                        {formatTimeStr(log.startTime)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick explanation tag */}
            <p className="text-[10px] text-text-muted flex items-center justify-center gap-1.5 font-medium">
              <span>💡 Fahre mit der Maus über die farbigen Segmente, um Details der Einheiten anzuzeigen.</span>
            </p>
          </div>
        </div>
      )}

      {/* Structured Session History Table (Complete lists with Clear All option) */}
      <div id="sessions-history-section" className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-brand-border">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Calendar size={14} className="text-brand-sage" />
            Einzelne Logeinträge ({filteredLogs.length})
          </h3>
          
          {timeLogs.length > 0 && (
            <button
              id="btn-clear-all-analytics-logs"
              onClick={() => {
                if (window.confirm("Bist du sicher, dass du das gesamte Zeit-Logbuch unwiderruflich leeren möchtest? Dies kann nicht rückgängig gemacht werden.")) {
                  clearAllLogs();
                }
              }}
              className="text-[10px] text-red-650 hover:text-red-700 font-bold hover:bg-red-50/50 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Historie löschen
            </button>
          )}
        </div>

        <div id="history-scrolly-grid" className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
          {filteredLogs.length === 0 ? (
            <div id="no-history-prompt" className="text-center py-6 text-text-muted text-xs italic font-serif">
              Keine Logeinträge für den gewählten Filter.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const proj = projects.find((p) => p.id === log.projectId) || {
                name: 'Gelöschtes Projekt',
                color: '#9ca3af',
              };

              // Identify log session labels in German
              let typeLabel = 'Stoppuhr';
              if (log.type === 'timer') typeLabel = 'Countdown';
              if (log.type === 'pomodoro_work') typeLabel = 'Pomo (Fokus)';
              if (log.type === 'pomodoro_break') typeLabel = 'Pomo (Pause)';

              return (
                <div
                  id={`history-item-${log.id}`}
                  key={log.id}
                  className="flex items-center justify-between p-4 bg-brand-cream/40 hover:bg-brand-sand/30 border border-brand-border/40 rounded-2xl transition hover:shadow-2xs group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      id={`log-indicator-${log.id}`}
                      className="w-3.5 h-3.5 rounded-full shrink-0 animate-pulse"
                      style={{ backgroundColor: proj.color }}
                    />
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-text-primary truncate capitalize">
                          {proj.name}
                        </span>
                        <span className="text-[8px] px-2 py-0.5 bg-brand-sand text-text-secondary font-bold rounded-md uppercase tracking-wider scale-95 border border-brand-border/30">
                          {typeLabel}
                        </span>
                      </div>
                      <div className="flex gap-2 text-[10px] text-text-muted font-semibold mt-0.5">
                        <span>{log.date}</span>
                        <span>•</span>
                        <span>{formatTimeStr(log.startTime)} - {formatTimeStr(log.endTime)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Duration and Pause summaries */}
                  <div className="flex items-center gap-3.5 shrink-0">
                    <div className="text-right">
                      <span className="block text-xs font-bold font-mono text-text-primary tabular-nums">
                        {Math.floor(log.duration / 60)}m {log.duration % 60}s
                      </span>
                      {log.pauseDuration > 0 && (
                        <span className="block text-[9px] font-bold text-brand-terracotta font-mono">
                          Pause: {Math.floor(log.pauseDuration / 60)}m {log.pauseDuration % 60}s
                        </span>
                      )}
                    </div>
                    
                    <button
                      id={`btn-delete-log-item-${log.id}`}
                      onClick={() => deleteTimeLog(log.id)}
                      className="p-1.8 text-text-muted hover:text-[#C2594D] hover:bg-red-50/50 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Logeintrag löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
