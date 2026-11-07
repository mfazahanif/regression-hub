'use client';

import { useState } from 'react';
import { getModuleSummary } from '@/utils/module-summary';
import { useAnalyticsView, type AnalyticsView } from './AnalyticsViewContext';

export function SummaryCards({ summary, modules }: { summary: any; modules?: any[] }) {
  const analyticsView = useAnalyticsView();
  const [localView, setLocalView] = useState<AnalyticsView>(modules ? 'module' : 'testcase');
  const view = analyticsView?.view ?? localView;
  const setView = analyticsView?.setView ?? setLocalView;
  const moduleSummary = getModuleSummary(modules || []);
  const shownSummary = view === 'module' && modules ? moduleSummary : summary;
  const getPercentage = (count: number) => {
    if (!shownSummary || !shownSummary.total || shownSummary.total === 0) return 0;
    return Math.round((count / shownSummary.total) * 100);
  };

  const total = shownSummary?.total || 0;
  const passed = shownSummary?.['PASSED'] || 0;
  const passedNotes = shownSummary?.['PASSED WITH NOTES'] || 0;
  const failed = shownSummary?.['FAILED'] || 0;
  const blocked = shownSummary?.['BLOCKED'] || 0;
  const dropped = shownSummary?.['DROPPED'] || 0;
  const todo = shownSummary?.['TO DO'] || 0;
  const completed = view === 'module' && modules ? shownSummary.executed : total - todo;
  const effectiveTotal = view === 'module' && modules ? completed - dropped : total - dropped;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const passRate = effectiveTotal > 0 ? Math.round(((passed + passedNotes) / effectiveTotal) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 rounded-[2rem] bg-indigo-950/20 border border-indigo-500/20 shadow-sm relative overflow-hidden group" data-testid="summary-cards">
      
      
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 relative z-10">
        <span className="text-indigo-200 font-bold text-sm tracking-wide uppercase">Summary by {view === 'module' && modules ? 'module' : 'testcase'}</span>
        {modules && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose summary metric">
            <button
              type="button"
              aria-pressed={view === 'module'}
              data-testid="summary-view-module-btn"
              onClick={() => setView('module')}
              className={`min-h-11 cursor-pointer rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-300 ${view === 'module' ? 'border-indigo-300 bg-indigo-500/30 text-white' : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 active:bg-slate-600'}`}
            >
              By module
            </button>
            <button
              type="button"
              aria-pressed={view === 'testcase'}
              data-testid="summary-view-testcase-btn"
              onClick={() => setView('testcase')}
              className={`min-h-11 cursor-pointer rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-300 ${view === 'testcase' ? 'border-indigo-300 bg-indigo-500/30 text-white' : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 active:bg-slate-600'}`}
            >
              By testcase
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
        
        {/* Main Progress Indicator */}
        <div className="flex flex-col gap-2">
          <span className="text-indigo-200 font-bold text-sm tracking-wide uppercase">{view === 'module' && modules ? 'Modules executed' : 'Testcases executed'}</span>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" data-testid="summary-completed-count">{completed}</span>
              <span className="text-xl font-bold text-indigo-300/50" data-testid="summary-total-count">/ {total}</span>
            
            <div className="ml-1 sm:ml-3 flex gap-2">
              <span className="text-indigo-200/90 font-bold bg-indigo-500/30 px-3 py-1.5 rounded-lg border border-indigo-400/30 shadow-inner" data-testid="summary-completion-pct">
                {completionPct}% Executed
              </span>
              <span className="text-emerald-200/90 font-bold bg-emerald-500/30 px-3 py-1.5 rounded-lg border border-emerald-400/30 shadow-inner" data-testid="summary-pass-rate">
                {passRate}% Passed
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Badges */}
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <div className="flex flex-col items-center bg-emerald-500/10 border border-emerald-500/20 px-5 py-2.5 rounded-2xl min-w-[90px] shadow-sm" data-testid="summary-badge-passed">
            <span className="text-emerald-400 text-2xl font-bold">{passed}</span>
            <span className="text-emerald-500/70 text-[10px] uppercase font-black tracking-wider mt-1">Passed</span>
          </div>
          
          <div className="flex flex-col items-center bg-amber-500/10 border border-amber-500/20 px-5 py-2.5 rounded-2xl min-w-[90px] shadow-sm" data-testid="summary-badge-notes">
            <span className="text-amber-400 text-2xl font-bold">{passedNotes}</span>
            <span className="text-amber-500/70 text-[10px] uppercase font-black tracking-wider mt-1">Notes</span>
          </div>
          
          <div className="flex flex-col items-center bg-rose-500/10 border border-rose-500/20 px-5 py-2.5 rounded-2xl min-w-[90px] shadow-sm" data-testid="summary-badge-failed">
            <span className="text-rose-400 text-2xl font-bold">{failed}</span>
            <span className="text-rose-500/70 text-[10px] uppercase font-black tracking-wider mt-1">Failed</span>
          </div>
          
          <div className="flex flex-col items-center bg-slate-500/10 border border-slate-500/20 px-5 py-2.5 rounded-2xl min-w-[90px] shadow-sm" data-testid="summary-badge-blocked">
            <span className="text-slate-400 text-2xl font-bold">{blocked}</span>
            <span className="text-slate-500/70 text-[10px] uppercase font-black tracking-wider mt-1">Blocked</span>
          </div>

          <div className="flex flex-col items-center bg-zinc-500/10 border border-zinc-500/20 px-5 py-2.5 rounded-2xl min-w-[90px] shadow-sm" data-testid="summary-badge-dropped">
            <span className="text-zinc-400 text-2xl font-bold">{dropped}</span>
            <span className="text-zinc-500/70 text-[10px] uppercase font-black tracking-wider mt-1">Dropped</span>
          </div>
          
          <div className="flex flex-col items-center bg-white/5 border border-slate-800 px-5 py-2.5 rounded-2xl min-w-[90px] shadow-sm" data-testid="summary-badge-todo">
            <span className="text-white/60 text-2xl font-bold">{todo}</span>
            <span className="text-white/40 text-[10px] uppercase font-black tracking-wider mt-1">To Do</span>
          </div>
        </div>
      </div>
      
      {/* Visual Progress Bar (Multi-Segment) */}
      <div className="w-full h-3 bg-slate-800 rounded-full mt-8 overflow-hidden flex relative z-10 border border-slate-800 shadow-inner" data-testid="summary-progress-bar">
        <div style={{ width: `${getPercentage(passed)}%` }} className="h-full bg-emerald-400 hover:bg-emerald-300   shadow-[0_0_10px_rgba(52,211,153,0.5)]" title="Passed"></div>
        <div style={{ width: `${getPercentage(passedNotes)}%` }} className="h-full bg-amber-400 hover:bg-amber-300   shadow-[0_0_10px_rgba(251,191,36,0.5)]" title="Passed with Notes"></div>
        <div style={{ width: `${getPercentage(failed)}%` }} className="h-full bg-rose-400 hover:bg-rose-300   shadow-[0_0_10px_rgba(244,63,94,0.5)]" title="Failed"></div>
        <div style={{ width: `${getPercentage(blocked)}%` }} className="h-full bg-slate-400 hover:bg-slate-300   shadow-[0_0_10px_rgba(148,163,184,0.5)]" title="Blocked"></div>
        <div style={{ width: `${getPercentage(dropped)}%` }} className="h-full bg-zinc-400 hover:bg-zinc-300   shadow-[0_0_10px_rgba(113,113,122,0.5)]" title="Dropped"></div>
      </div>
    </div>
  );
}
