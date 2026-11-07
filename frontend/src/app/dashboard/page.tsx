import { Sidebar } from '@/components/dashboard/Sidebar';
import { NewSessionButton } from '@/components/dashboard/NewSessionButton';
import { UserAssignments } from '@/components/dashboard/UserAssignments';
import { SessionSelector } from '@/components/dashboard/SessionSelector';
import { ExecutionChart } from '@/components/dashboard/ExecutionChart';
import { AnalyticsViewToggle } from '@/components/dashboard/AnalyticsViewToggle';
import { ModuleList } from '@/components/dashboard/ModuleList';
import { AnalyticsViewProvider } from '@/components/dashboard/AnalyticsViewContext';

async function fetchGlobalAnalytics(sessionId?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const url = sessionId ? `${baseUrl}/analytics?sessionId=${sessionId}` : `${baseUrl}/analytics`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    return { summary: { total: 0 }, userAssignments: [] };
  }
  const json = await res.json();
  return json.data;
}

async function fetchSessionModules(sessionId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const res = await fetch(`${baseUrl}/sessions/${sessionId}/modules`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

async function fetchAllSessions() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const res = await fetch(`${baseUrl}/sessions`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

function getWorkingDaysLeft(endDate: string | Date) {
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  if (end.getTime() < now.getTime()) {
    let overdueCount = 0;
    let cur = new Date(end);
    while (cur < now) {
      cur.setDate(cur.getDate() + 1);
      if (cur.getDay() !== 0 && cur.getDay() !== 6) overdueCount++;
    }
    return -overdueCount;
  } else {
    let leftCount = 0;
    let cur = new Date(now);
    while (cur < end) {
      cur.setDate(cur.getDate() + 1);
      if (cur.getDay() !== 0 && cur.getDay() !== 6) leftCount++;
    }
    return leftCount;
  }
}


function renderWorkingDays(days: number) {
  if (days < 0) {
    return <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-rose-600/30 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(225,29,72,0.3)]">{Math.abs(days)} Working Days Overdue</span>;
  } else if (days <= 2) {
    return <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_5px_rgba(225,29,72,0.2)]">{days} Working Days Left</span>;
  } else if (days <= 5) {
    return <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_5px_rgba(245,158,11,0.2)]">{days} Working Days Left</span>;
  }
  return <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">{days} Working Days Left</span>;
}

export default async function GlobalDashboardPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const resolvedParams = await searchParams;
  const allSessions = await fetchAllSessions();
  const activeSessions = allSessions.filter((s: any) => s.isOpen);

  const selectedSessionId = resolvedParams.session;
  const isSingleSessionMode = !!selectedSessionId;
  const targetSessionId = selectedSessionId;

  const data = await fetchGlobalAnalytics(targetSessionId);
  const sessionModules = targetSessionId ? await fetchSessionModules(targetSessionId) : [];

  let activeSessionsWithAnalytics: any[] = [];
  if (!isSingleSessionMode) {
    activeSessionsWithAnalytics = await Promise.all(
      activeSessions.map(async (s: any) => {
        const [analytics, modules] = await Promise.all([
          fetchGlobalAnalytics(s.id),
          fetchSessionModules(s.id),
        ]);
        return { ...s, analytics, modules };
      })
    );
  }
  return (
    <div className="min-h-screen relative flex bg-slate-950" id="global-dashboard-page" data-testid="global-dashboard-page">
      

      <Sidebar />

      <AnalyticsViewProvider>
      <div className="relative z-10 flex-1 p-5 sm:p-7 xl:p-10 text-white font-sans overflow-y-auto" data-testid="dashboard-content">
        <div className="w-full space-y-9 pb-12">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5" data-testid="dashboard-header">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white" data-testid="dashboard-header-title">Dashboard</h1>
                </div>
              </div>
            </div>
            <NewSessionButton />
          </header>

          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-5 border-b border-slate-700/70 pb-5" data-testid="dashboard-overview-bar">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight" data-testid="dashboard-overview-title">Overview</h2>
              <p className="mt-1 text-sm text-slate-600">Current test runs and team progress.</p>
            </div>
            <div className="w-full sm:w-auto">
              <p className="mb-1.5 text-xs font-semibold text-slate-600">Session filter</p>
              <SessionSelector currentSession={resolvedParams.session} />
            </div>
          </div>

          <AnalyticsViewToggle />

          {!isSingleSessionMode ? (
            <div className={`grid grid-cols-1 gap-6 xl:gap-7 ${activeSessionsWithAnalytics.length === 1 ? 'max-w-3xl' : 'md:grid-cols-2 xl:grid-cols-3'}`} data-testid="active-sessions-grid">
              {activeSessionsWithAnalytics.map(session => (
                <section key={session.id} id={`session-card-${session.id}`} data-testid={`session-overview-card-${session.id}`} className="bg-slate-900 border border-slate-700 p-6 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col items-center">
                  
                  
                  <div className="w-full flex justify-between items-start mb-5 relative z-10">
                    <div className="min-w-0 w-full">
                      <h2 className="text-xl font-bold text-white mb-3 truncate" data-testid={`session-overview-name-${session.id}`}>{session.name}</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {session.status}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-900 text-white/70 border border-slate-800">
                          {new Date(session.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {session.endDate || session.closedAt ? new Date(session.endDate || session.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Ongoing'}
                        </span>
                        {session.status !== 'Finished' && session.status !== 'Done' && session.endDate && (
                          (() => {
                            return renderWorkingDays(getWorkingDaysLeft(session.endDate));
                          })()
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-full relative z-10 mb-5">
                    <ExecutionChart summary={session.analytics.summary} modules={session.modules} />
                  </div>

                  <a 
                    id={`execute-session-link-${session.id}`}
                    data-testid={`execute-session-link-${session.id}`}
                    href={`/dashboard/execution?session=${session.id}`}
                    className="relative z-10 min-h-11 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-lg text-center flex justify-center items-center gap-2 transition-colors"
                  >
                    Execute Session
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </a>
                </section>
              ))}
              {activeSessionsWithAnalytics.length === 0 && (
                <div className="col-span-full text-white/50 py-8 text-center bg-slate-800 rounded-xl border border-slate-800" data-testid="no-active-sessions-message">
                  No active sessions found.
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" data-testid="single-session-view">
              {/* Chart on the left */}
              <section className="lg:col-span-4 bg-slate-900  border border-slate-700 p-8 rounded-[2rem] shadow-sm relative overflow-hidden flex flex-col items-center justify-center" data-testid="session-chart-section">
                <div className="w-full flex flex-col items-start mb-8 relative z-10">
                  <h2 className="text-xl font-bold text-white mb-2" data-testid="session-chart-title">
                    Execution Status Distribution
                  </h2>
                  {targetSessionId && data && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-900 text-white/70 border border-slate-800">
                        {(() => {
                          const s = allSessions.find((s: any) => s.id === targetSessionId);
                          if (!s) return 'Timeline Unknown';
                          return `${new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${s.endDate || s.closedAt ? new Date(s.endDate || s.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Ongoing'}`;
                        })()}
                      </span>
                      {(() => {
                        const s = allSessions.find((s: any) => s.id === targetSessionId);
                        if (!s || s.status === 'Finished' || s.status === 'Done' || !s.endDate) return null;
                        return renderWorkingDays(getWorkingDaysLeft(s.endDate));
                      })()}
                    </div>
                  )}
                </div>
                <ExecutionChart summary={data.summary} modules={sessionModules} />
              </section>

              {/* User assignments on the right */}
              <section className="lg:col-span-8 bg-slate-900  border border-slate-700 p-8 rounded-[2rem] shadow-sm relative overflow-hidden" data-testid="session-team-section">
                
                <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-white relative z-10" data-testid="session-team-title">
                  <span className="w-2 h-6 bg-indigo-500 rounded-full inline-block shadow-[0_0_10px_rgba(99,102,241,0.6)]"></span>
                  Team Assignments
                </h2>
                <div className="relative z-10">
                  <UserAssignments assignments={data.userAssignments} />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
      </AnalyticsViewProvider>
    </div>
  );
}
