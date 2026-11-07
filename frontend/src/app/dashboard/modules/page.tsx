import { Sidebar } from '@/components/dashboard/Sidebar';
import { ModuleManagement } from '@/components/dashboard/ModuleManagement';
import { Suspense } from 'react';

export default function ModulesPage() {
  return (
    <div className="min-h-screen relative flex bg-slate-950" id="modules-page" data-testid="modules-page">
      
      <Sidebar />

      <div className="relative z-10 flex-1 p-8 text-white font-sans overflow-y-auto" data-testid="modules-content">
        <div className="w-full space-y-8 pb-12">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-700 p-6 rounded-[2rem] shadow-sm" data-testid="modules-header">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-sm ">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md" data-testid="modules-header-title">Module Management</h1>
                </div>
              </div>
            </div>
            
          </header>

          <Suspense fallback={<div className=" h-96 bg-white/5 rounded-2xl"></div>}>
            <ModuleManagement />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
