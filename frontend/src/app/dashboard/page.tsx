import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { NewSessionButton } from '@/components/dashboard/NewSessionButton';
import { UserAssignments } from '@/components/dashboard/UserAssignments';
import { SessionSelector } from '@/components/dashboard/SessionSelector';
import { ExecutionChart } from '@/components/dashboard/ExecutionChart';
import { ModuleList } from '@/components/dashboard/ModuleList';

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
  const isSingleSessionMode = !!selectedSessionId || activeSessions.length === 1;
  const targetSessionId = selectedSessionId || (activeSessions.length === 1 ? activeSessions[0].id : undefined);

  // If we are showing a specific session (selected or only 1 active)
  const data = await fetchGlobalAnalytics(targetSessionId);
  const sessionModules = targetSessionId ? await fetchSessionModules(targetSessionId) : [];

  // If we are showing multiple active sessions, we need analytics for each to draw their charts
  let activeSessionsWithAnalytics: any[] = [];
  if (!isSingleSessionMode) {
    activeSessionsWithAnalytics = await Promise.all(
      activeSessions.map(async (s: any) => {
        const analytics = await fetchGlobalAnalytics(s.id);
        return { ...s, analytics };
      })
    );
  }
  
  return (
    <div className="min-h-screen relative flex bg-slate-950" id="global-dashboard-page" data-testid="global-dashboard-page">
      

      <Sidebar />

      <div className="relative z-10 flex-1 p-8 text-white font-sans overflow-y-auto" data-testid="dashboard-content">
        <div className="w-full space-y-8 pb-12">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900  border border-slate-700 p-6 rounded-[2rem] shadow-sm" data-testid="dashboard-header">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-sm ">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md" data-testid="dashboard-header-title">Execution Dashboard</h1>
                  <p className="text-indigo-200 font-medium text-sm mt-0.5">High-Level Testing Summary</p>
                </div>
              </div>
            </div>
            <NewSessionButton />
          </header>

          
          <div className="flex justify-between items-center mb-1 pr-2 mt-4" data-testid="dashboard-overview-bar">
            <h2 className="text-xl font-bold text-white tracking-tight" data-testid="dashboard-overview-title">Overview</h2>
            <SessionSelector currentSession={resolvedParams.session} />
          </div>

          <SummaryCards summary={data.summary} />
          
          {!isSingleSessionMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="active-sessions-grid">
              {activeSessionsWithAnalytics.map(session => (
                <section key={session.id} id={`session-card-${session.id}`} data-testid={`session-overview-card-${session.id}`} className="bg-slate-900  border border-slate-700 p-8 rounded-[2rem] shadow-sm relative overflow-hidden flex flex-col items-center">
                  
                  
                  <div className="w-full flex justify-between items-start mb-6 relative z-10">
                    <div className="container">
                      <h2 className="text-xl font-bold text-white mb-2 truncate text-nowrap" data-testid={`session-overview-name-${session.id}`}>{session.name}</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {session.status}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-900 text-white/70 border border-slate-800">
                          {new Date(session.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {session.endDate ? new Date(session.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Ongoing'}
                        </span>
                        {session.status !== 'Finished' && session.status !== 'Done' && session.endDate && (
                          (() => {
                            return renderWorkingDays(getWorkingDaysLeft(session.endDate));
                          })()
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-full relative z-10 mb-6">
                    <ExecutionChart summary={session.analytics.summary} />
                  </div>

                  <a 
                    id={`execute-session-link-${session.id}`}
                    data-testid={`execute-session-link-${session.id}`}
                    href={`/dashboard/execution?session=${session.id}`}
                    className="relative z-10 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-center shadow-sm hover:  flex justify-center items-center gap-2"
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
                          return `${new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${s.endDate ? new Date(s.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Ongoing'}`;
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
                <ExecutionChart summary={data.summary} />
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
    </div>
  );
}
