import { Sidebar } from '@/components/dashboard/Sidebar';
import { ExecutionTable } from '@/components/dashboard/ExecutionTable';
import Link from 'next/link';
import { BackButton } from '@/components/dashboard/BackButton';

async function fetchSessionInfo(sessionId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const res = await fetch(`${baseUrl}/sessions`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return (json.data || []).find((s: any) => s.id === sessionId) || null;
}

export default async function ExecutionMenuPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = await params;
  const session = await fetchSessionInfo(resolvedParams.sessionId);
  const status = session?.status;
  
  return (
    <div className="min-h-screen relative flex bg-slate-950" id="session-execution-page" data-testid="session-execution-page">
      

      <Sidebar />

      <div className="relative z-10 flex-1 p-8 text-white font-sans overflow-y-auto" data-testid="session-execution-content">
        <div className="w-full space-y-8 pb-12">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900  border border-slate-700 p-6 rounded-[2rem] shadow-sm" data-testid="session-execution-header">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <BackButton />
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md" data-testid="session-execution-header-title">
                    {session ? session.name : 'Execution Menu'}
                  </h1>
                  <div className="text-indigo-200 font-medium text-sm mt-1.5 flex items-center gap-2">
                    {session ? (
                      <>
                        <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[10px] border border-indigo-500/30 uppercase font-bold tracking-wider">
                          {session.environment?.name || 'Session'}
                        </span>
                        <span>Execute testcases and update statuses</span>
                      </>
                    ) : (
                      <span>Execute testcases and update statuses</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <section className="bg-slate-900  border border-slate-700 p-8 rounded-[2rem] shadow-sm relative overflow-hidden" data-testid="session-execution-table-section">
            <ExecutionTable sessionId={resolvedParams.sessionId} sessionStatus={status} />
          </section>
        </div>
      </div>
    </div>
  );
}
