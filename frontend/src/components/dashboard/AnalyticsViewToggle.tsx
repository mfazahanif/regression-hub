'use client';

import { useAnalyticsView } from './AnalyticsViewContext';

export function AnalyticsViewToggle() {
  const analyticsView = useAnalyticsView();

  if (!analyticsView) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="dashboard-analytics-toggle">
      <span className="text-sm font-semibold text-white">Analytics by:</span>
      <div className="flex flex-wrap items-center gap-x-3" role="group" aria-label="Choose summary view">
        <button
          type="button"
          aria-pressed={analyticsView.view === 'module'}
          data-testid="chart-view-module-btn"
          onClick={() => analyticsView.setView('module')}
          className={`min-h-11 cursor-pointer border-b-2 px-1 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${analyticsView.view === 'module' ? 'border-indigo-300 text-white' : 'border-transparent text-slate-300 hover:border-slate-500 hover:text-white active:text-white'}`}
        >
          Module
        </button>
        <button
          type="button"
          aria-pressed={analyticsView.view === 'testcase'}
          data-testid="chart-view-testcase-btn"
          onClick={() => analyticsView.setView('testcase')}
          className={`min-h-11 cursor-pointer border-b-2 px-1 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${analyticsView.view === 'testcase' ? 'border-indigo-300 text-white' : 'border-transparent text-slate-300 hover:border-slate-500 hover:text-white active:text-white'}`}
        >
          Testcases
        </button>
      </div>
    </div>
  );
}
