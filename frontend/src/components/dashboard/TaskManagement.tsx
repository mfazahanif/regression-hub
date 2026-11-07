'use client';

import { useState, useEffect, useMemo } from 'react';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { useRouter } from 'next/navigation';
import { ViewMode, ViewToggle } from './ViewToggle';
import { authenticatedFetch } from '@/lib/authenticatedFetch';

export function TaskManagement() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<ViewMode>('list');
  
  const router = useRouter();

  const getPercentage = (count: number, total: number) => {
    if (!total) return 0;
    return (count / total) * 100;
  };

  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const authStr = localStorage.getItem('auth');
        if (!authStr) {
          router.push('/login');
          return;
        }
        
        const res = await authenticatedFetch(`${baseUrl}/sessions/my-tasks`, {
          cache: 'no-store'
        }, baseUrl);
        
        if (res.ok) {
          const data = await res.json();
          setTasks(data.data.tasks || []);
          setSummary(data.data.summary || null);
        }
      } catch (e) {
        console.error('Failed to fetch tasks', e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
  }, [baseUrl, router]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks;
    const lowerQuery = searchQuery.toLowerCase();
    return tasks.filter(t => 
      t.moduleName.toLowerCase().includes(lowerQuery) || 
      t.sessionName.toLowerCase().includes(lowerQuery) ||
      t.moduleCode.toLowerCase().includes(lowerQuery)
    );
  }, [tasks, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div data-testid="task-management-container" className="flex flex-col gap-6">
      {/* Top Summary Cards */}
                  {summary && (
        <SummaryCards summary={{
          total: summary.totalAssignedTestcases,
          ...summary.statusBreakdown,
          'TO DO': (summary.statusBreakdown?.['TO DO'] || 0) + (summary.statusBreakdown?.['UNTESTED'] || 0)
        }} modules={tasks} />
      )}

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-indigo-300/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input 
            id="task-mgmt-search-input"
            data-testid="task-mgmt-search-input"
            type="text" 
            placeholder="Search tasks by module name, code, or session..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/30 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {/* Module Cards */}
      <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6' : 'flex flex-col gap-3'}>
        {filteredTasks.length === 0 ? (
          <div data-testid="task-mgmt-empty" className="col-span-full py-20 flex flex-col items-center justify-center text-indigo-200/50 bg-slate-900/50 rounded-2xl border border-slate-800">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3-10l-4 4-2-2"></path></svg>
            <p className="text-xl font-medium">No tasks found</p>
            <p className="text-sm mt-2">You don't have any claimed modules in active sessions.</p>
          </div>
        ) : (
                    filteredTasks.map(task => {
            const passed = task.statusBreakdown?.['PASSED'] || 0;
            const passedNotes = task.statusBreakdown?.['PASSED WITH NOTES'] || 0;
            const dropped = task.statusBreakdown?.['DROPPED'] || 0;
            const todo = (task.statusBreakdown?.['TO DO'] || 0) + (task.statusBreakdown?.['UNTESTED'] || 0);
            const failed = task.statusBreakdown?.['FAILED'] || 0;
            const blocked = task.statusBreakdown?.['BLOCKED'] || 0;
          
            const completed = task.totalTestcases - todo;
            const effectiveTotal = task.totalTestcases - dropped;
            const completionPct = task.totalTestcases > 0 ? Math.round((completed / task.totalTestcases) * 100) : 0;
            const passRate = effectiveTotal > 0 ? Math.round(((passed + passedNotes) / effectiveTotal) * 100) : 0;
          
            const isDone = task.totalTestcases > 0 && completed === task.totalTestcases && failed === 0 && blocked === 0;

            if (view === 'list') return (
              <div key={`${task.sessionId}-${task.moduleId}`} data-testid={`task-item-${task.sessionId}-${task.moduleId}`} className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold text-white">{task.moduleName}</h3><span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-indigo-300">{task.moduleCode}</span></div>
                  <p className="mt-1 truncate text-xs text-slate-400">{task.sessionName} · {task.totalTestcases} test cases</p>
                </div>
                <div className="flex items-center gap-4 text-xs sm:w-40"><span className="text-indigo-300">{completionPct}% executed</span><span className="text-emerald-400">{passRate}% passed</span></div>
                <button 
                  id={`task-execute-btn-${task.sessionId}-${task.moduleId}`}
                  data-testid={`task-execute-btn-${task.sessionId}-${task.moduleId}`}
                  onClick={() => router.push(`/dashboard/sessions/${task.sessionId}/execution?moduleId=${task.moduleId}`)} 
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Execute
                </button>
              </div>
            );

            return (
              <div key={`${task.sessionId}-${task.moduleId}`} data-testid={`task-card-${task.sessionId}-${task.moduleId}`} className={`bg-slate-900 border border-slate-700 rounded-2xl p-5 flex ${view === 'grid' ? 'flex-col relative overflow-hidden' : 'flex-col lg:flex-row lg:items-center gap-5'} group hover:border-indigo-400 transition-colors`}>
                {isDone && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl shadow-sm z-10 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    Done
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-4 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-indigo-200 transition-colors line-clamp-1">{task.moduleName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300">{task.moduleCode}</span>
                      </div>
                    </div>
                  </div>
                </div>
  
                <div className="mb-5 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-indigo-200/70 bg-black/20 p-2.5 rounded-lg border border-white/5">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <span className="truncate" title={task.sessionName}>{task.sessionName}</span>
                  </div>
                </div>
  
                {/* Module Progress Stats */}
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-2">
                    {/* <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Progress</span> */}
                    <div className="flex gap-2">
                      <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">{completionPct}% Executed</span>
                      <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">{passRate}% Passed</span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex mb-4 border border-slate-700 relative z-0">
                    <div style={{ width: `${getPercentage(task.statusBreakdown?.['PASSED'] || 0, task.totalTestcases)}%` }} className="h-full bg-emerald-400" title="Passed"></div>
                    <div style={{ width: `${getPercentage(task.statusBreakdown?.['PASSED WITH NOTES'] || 0, task.totalTestcases)}%` }} className="h-full bg-amber-400" title="Passed with Notes"></div>
                    <div style={{ width: `${getPercentage(task.statusBreakdown?.['FAILED'] || 0, task.totalTestcases)}%` }} className="h-full bg-rose-400" title="Failed"></div>
                    <div style={{ width: `${getPercentage(task.statusBreakdown?.['BLOCKED'] || 0, task.totalTestcases)}%` }} className="h-full bg-slate-400" title="Blocked"></div>
                    <div style={{ width: `${getPercentage(task.statusBreakdown?.['DROPPED'] || 0, task.totalTestcases)}%` }} className="h-full bg-zinc-400" title="Dropped"></div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {(task.statusBreakdown?.['PASSED'] || 0) > 0 && (
                      <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">{task.statusBreakdown['PASSED']} Passed</span>
                      </div>
                    )}
                    {(task.statusBreakdown?.['PASSED WITH NOTES'] || 0) > 0 && (
                      <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                        <span className="text-[10px] font-bold text-amber-400 uppercase">{task.statusBreakdown['PASSED WITH NOTES']} Notes</span>
                      </div>
                    )}
                    {(task.statusBreakdown?.['FAILED'] || 0) > 0 && (
                      <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                        <span className="text-[10px] font-bold text-rose-400 uppercase">{task.statusBreakdown['FAILED']} Failed</span>
                      </div>
                    )}
                    {(task.statusBreakdown?.['TO DO'] || 0) > 0 && (
                      <div className="flex items-center gap-1.5 bg-white/5 border border-slate-700 px-2.5 py-1 rounded-md">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase">{task.statusBreakdown['TO DO']} To Do</span>
                      </div>
                    )}
                  </div>
                </div>
  
                <button 
                  id={`task-card-execute-btn-${task.sessionId}-${task.moduleId}`}
                  data-testid={`task-card-execute-btn-${task.sessionId}-${task.moduleId}`}
                  onClick={() => router.push(`/dashboard/sessions/${task.sessionId}/execution?moduleId=${task.moduleId}`)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  Execute Testcases
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
