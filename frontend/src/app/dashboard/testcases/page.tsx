import { Sidebar } from '@/components/dashboard/Sidebar';
import { TestcaseManagement } from '@/components/dashboard/TestcaseManagement';
import { Suspense } from 'react';

export default function TestcasesPage() {
  return (
    <div className="min-h-screen relative flex bg-slate-950" id="testcases-page" data-testid="testcases-page">
      
      <Sidebar />

      <div className="relative z-10 flex-1 p-8 text-white font-sans overflow-y-auto" data-testid="testcases-content">
        <div className="w-full space-y-8 pb-12">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-700 p-6 rounded-[2rem] shadow-sm" data-testid="testcases-header">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-sm ">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md" data-testid="testcases-header-title">Testcase Repository</h1>
                  <p className="text-indigo-200 font-medium text-sm mt-0.5">Manage and maintain your test scenarios</p>
                </div>
              </div>
            </div>
            
          </header>

          <Suspense fallback={<div className=" h-96 bg-white/5 rounded-2xl"></div>}>
            <TestcaseManagement />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
