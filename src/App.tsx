import { useEffect, useState } from 'react';
import { TimeTrackerProvider } from './context/TimeTrackerContext';
import { TimerEngine } from './components/TimerEngine';
import { StatsDashboard } from './components/StatsDashboard';
import { Clock, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [currentSystemTime, setCurrentSystemTime] = useState(new Date());

  // Real-time ticking system-clock in header
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSystemTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSystemTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    return date.toLocaleString('de-DE', options);
  };

  return (
    <TimeTrackerProvider>
      <div id="app-viewport" className="min-h-screen bg-brand-cream text-text-secondary antialiased py-8 px-4 sm:px-6 lg:px-8 font-sans">
        
        {/* Main Fluid Constraint */}
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Main Top Header with integrated Digital System Clock */}
          <header id="app-header" className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-brand-border pb-6 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-sage rounded-xl flex items-center justify-center text-white font-serif font-bold text-xl shadow-sm">A</div>
                <h1 id="app-headline" className="text-2xl sm:text-3xl font-serif italic text-text-primary">
                  ASL Logbook <span className="text-brand-sage font-sans not-italic text-xs tracking-widest uppercase font-bold border-l border-brand-border pl-3 ml-1">Zeit-Logbuch</span>
                </h1>
              </div>
              <p id="app-subhead" className="text-sm text-text-secondary mt-2.5 max-w-2xl">
                Erstelle Themen, starte flexible Stoppuhren oder anpassbare Pomodoro-Zyklen. Erhalte am Ende des Tages eine genaue produktive Stunden-Analyse.
              </p>
            </div>

            {/* Premium Natural Slate Clock Badge */}
            <div id="live-time-badge" className="flex items-center gap-2.5 px-4 py-2 bg-brand-sand rounded-2xl border border-brand-border shadow-sm">
              <Clock size={16} className="text-brand-sage animate-pulse" />
              <span id="live-time-ticker" className="text-xs font-bold font-mono text-text-primary tabular-nums">
                {formatSystemTime(currentSystemTime)}
              </span>
            </div>
          </header>

          {/* Core Workspace Sections */}
          <main id="app-main-workspace" className="w-full">
            <TimerEngine />
          </main>

          {/* Lower Panel: Extended Graphical Reports & Logs (Full width) */}
          <section id="analytics-fullwidth-row">
            <StatsDashboard />
          </section>

          {/* Footer branding */}
          <footer id="app-global-footer" className="text-center pt-8 border-t border-brand-border text-xs text-text-muted font-medium">
            <p className="leading-loose">
              © {currentSystemTime.getFullYear()} ASL Logbook • Integrierter Offline-Speicher (localStorage)
            </p>
            <p className="text-[10px] text-text-muted mt-1 flex items-center justify-center gap-1">
              <HelpCircle size={10} />
              Entwickelt für wissenschaftliche Arbeitsanalysen und fokussiertes Lernen.
            </p>
          </footer>

        </div>
      </div>
    </TimeTrackerProvider>
  );
}
