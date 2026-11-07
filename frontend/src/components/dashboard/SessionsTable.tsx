'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DownloadReportButton } from './DownloadReportButton';

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

export function SessionsTable({ initialSessions }: { initialSessions: any[] }) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sorts, setSorts] = useState<SortConfig[]>([]);
  const router = useRouter();
  const itemsPerPage = 10;

  const handleSort = (key: string) => {
    setSorts(prev => {
      const existing = prev.find(s => s.key === key);
      if (!existing) {
        return [...prev, { key, direction: 'asc' }];
      }
      if (existing.direction === 'asc') {
        return prev.map(s => s.key === key ? { ...s, direction: 'desc' } : s);
      }
      return prev.filter(s => s.key !== key);
    });
  };

  const getSortIndex = (key: string) => {
    const idx = sorts.findIndex(s => s.key === key);
    return idx !== -1 ? idx + 1 : null;
  };

  const getSortDirection = (key: string) => {
    const existing = sorts.find(s => s.key === key);
    return existing ? existing.direction : null;
  };

  const SortHeader = ({ label, sortKey }: { label: string, sortKey: string }) => {
    const direction = getSortDirection(sortKey);
    const index = getSortIndex(sortKey);
    return (
      <th 
        data-testid={`sessions-th-${sortKey}`}
        className="py-4 px-6 text-indigo-200 font-semibold cursor-pointer hover:bg-slate-700/50 transition-colors select-none group"
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center gap-2">
          {label}
          <div className="flex flex-col items-center">
            {direction === 'asc' ? (
              <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
            ) : direction === 'desc' ? (
              <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            ) : (
              <svg className="w-3 h-3 text-slate-600 group-hover:text-slate-500 transition-colors" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l4 4a1 1 0 01-1.414 1.414L10 5.414 6.707 8.707a1 1 0 01-1.414-1.414l4-4A1 1 0 0110 3zm0 14a1 1 0 01-.707-.293l-4-4a1 1 0 111.414-1.414L10 14.586l3.293-3.293a1 1 0 111.414 1.414l-4 4A1 1 0 0110 17z" clipRule="evenodd" /></svg>
            )}
          </div>
          {index !== null && sorts.length > 1 && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 w-4 h-4 flex items-center justify-center rounded-full font-bold ml-1">
              {index}
            </span>
          )}
        </div>
      </th>
    );
  };

  // 1. Pre-process items for sorting fields
  const processedSessions = useMemo(() => {
    return initialSessions.map(session => {
      const summary = session.analytics?.summary || { total: 0 };
      const total = summary.total || 0;
      const passed = summary['PASSED'] || 0;
      const passedNotes = summary['PASSED WITH NOTES'] || 0;
      const dropped = summary['DROPPED'] || 0;
      const todo = summary['TO DO'] || 0;
      const completed = total - todo;
      const effectiveTotal = total - dropped;
      
      const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const passRate = effectiveTotal > 0 ? Math.round(((passed + passedNotes) / effectiveTotal) * 100) : 0;
      
      return {
        ...session,
        completionPct,
        passRate,
        timelineSortVal: new Date(session.startDate).getTime()
      };
    });
  }, [initialSessions]);

  // 2. Filter
  const filtered = useMemo(() => {
    return processedSessions.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      (s.environment?.name || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [processedSessions, search]);

  // 3. Sort
  const sorted = useMemo(() => {
    const statusWeight: Record<string, number> = {
      'ON PROGRESS': 1,
      'TO DO': 2,
      'FINISHED': 3,
      'DONE': 3
    };

    return [...filtered].sort((a, b) => {
      for (const sort of sorts) {
        let valA, valB;
        if (sort.key === 'name') {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else if (sort.key === 'environment') {
          valA = a.environment.name.toLowerCase();
          valB = b.environment.name.toLowerCase();
        } else if (sort.key === 'timeline') {
          valA = a.timelineSortVal;
          valB = b.timelineSortVal;
        } else if (sort.key === 'status') {
          valA = statusWeight[a.status?.toUpperCase()] || 99;
          valB = statusWeight[b.status?.toUpperCase()] || 99;
        } else if (sort.key === 'executed') {
          valA = a.completionPct;
          valB = b.completionPct;
        } else if (sort.key === 'passed') {
          valA = a.passRate;
          valB = b.passRate;
        }

        if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
      }
      
      // Default secondary sort if no custom sorts defined or if tied
      return 0;
    });
  }, [filtered, sorts]);

  // 4. Paginate
  const totalPages = Math.ceil(sorted.length / itemsPerPage) || 1;
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleRowClick = (sessionId: string) => {
    router.push(`/dashboard/execution?session=${sessionId}`);
  };

  return (
    <div data-testid="sessions-table-container" className="w-full">
      <div className="mb-6 flex justify-between items-center">
        <div className="relative w-72">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            id="sessions-search-input"
            data-testid="sessions-search-input"
            type="text"
            placeholder="Search sessions..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-4">
          {sorts.length > 0 && (
            <button 
              id="sessions-disable-sort-btn"
              data-testid="sessions-disable-sort-btn"
              onClick={() => setSorts([])}
              className="text-xs font-semibold px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              Disable Sorting
            </button>
          )}
          <div data-testid="sessions-total-count" className="text-sm text-indigo-200">
            Total: <span className="font-bold text-white">{filtered.length}</span> sessions
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
        <table data-testid="sessions-table" className="w-max min-w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/50">
              <th className="py-4 px-6 text-indigo-200 font-semibold w-16">No</th>
              <SortHeader label="Name" sortKey="name" />
              <SortHeader label="Environment" sortKey="environment" />
              <SortHeader label="Timeline" sortKey="timeline" />
              <SortHeader label="Status" sortKey="status" />
              <SortHeader label="Executed" sortKey="executed" />
              <SortHeader label="Passed" sortKey="passed" />
              <th className="py-4 px-4 text-indigo-200 font-semibold text-center">Report</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((session, index) => {
              const absoluteIndex = (currentPage - 1) * itemsPerPage + index + 1;

              return (
                <tr 
                  key={session.id} 
                  data-testid={`session-row-${session.id}`}
                  data-session-id={session.id}
                  onClick={() => handleRowClick(session.id)}
                  className="border-b border-slate-800/50 hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <td className="py-4 px-6 font-medium text-white/50">{absoluteIndex}</td>
                  <td data-testid={`session-name-${session.id}`} className="py-4 px-6 font-bold text-white group-hover:text-indigo-400 transition-colors">{session.name}</td>
                  <td data-testid={`session-env-${session.id}`} className="py-4 px-6">
                    <span className="bg-slate-950 px-2 py-1 rounded text-sm text-indigo-200 border border-slate-800">{session.environment.name}</span>
                  </td>
                  <td data-testid={`session-timeline-${session.id}`} className="py-4 px-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-white/80">{new Date(session.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span className="text-xs text-white/50">to {session.endDate
                        ? new Date(session.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : session.closedAt
                          ? new Date(session.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Ongoing'}</span>
                    </div>
                  </td>
                  <td data-testid={`session-status-${session.id}`} className="py-4 px-6">
                    <span className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                      session.status === 'Finished' || session.status === 'Done' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      session.status === 'On Progress' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}>
                      {session.status}
                    </span>
                  </td>
                  <td data-testid={`session-executed-${session.id}`} className="py-4 px-6">
                    <span className="text-indigo-200/90 text-sm font-bold bg-indigo-500/20 px-2.5 py-1 rounded border border-indigo-400/20 inline-block text-center min-w-[3rem]">
                      {session.completionPct}%
                    </span>
                  </td>
                  <td data-testid={`session-passed-${session.id}`} className="py-4 px-6">
                    <span className="text-emerald-200/90 text-sm font-bold bg-emerald-500/20 px-2.5 py-1 rounded border border-emerald-400/20 inline-block text-center min-w-[3rem]">
                      {session.passRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center" onClick={event => event.stopPropagation()}>
                    {session.status === 'Finished' && (
                      <DownloadReportButton sessionId={session.id} sessionName={session.name} compact />
                    )}
                  </td>
                </tr>
              )
            })}
            {paginated.length === 0 && (
              <tr>
                <td data-testid="sessions-empty-state" colSpan={8} className="py-12 text-center text-white/50">
                  {search ? 'No sessions match your search.' : 'No sessions found. Create one from the sidebar.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div data-testid="sessions-pagination" className="mt-6 flex justify-between items-center">
          <div className="text-sm text-white/50">
            Showing <span className="text-white font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, sorted.length)}</span> of <span className="text-white font-medium">{sorted.length}</span> entries
          </div>
          <div className="flex gap-2">
            <button 
              id="sessions-prev-page-btn"
              data-testid="sessions-prev-page-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  data-testid={`sessions-page-${i + 1}-btn`}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-white/70 hover:bg-slate-700 hover:text-white border border-slate-700'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              id="sessions-next-page-btn"
              data-testid="sessions-next-page-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
