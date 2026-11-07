'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function CloneSessionButton({ sessionId }: { sessionId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const authData = localStorage.getItem('auth');
      if (authData) setRole(JSON.parse(authData).user?.role || 'QA Member');
      else setRole('QA Member');
    } catch (e) {
      setRole('QA Member');
    }
  }, []);

  if (role === null) return null;

  const handleClone = async () => {
    setIsCloning(true);
    try {
      const authStr = JSON.parse(localStorage.getItem('auth') || '{}');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/sessions/${sessionId}/clone`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authStr.access_token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setIsModalOpen(false);
        if (json.data && json.data.id) {
          router.push(`/dashboard/sessions/${json.data.id}/execution`);
        } else {
          router.push('/dashboard/sessions');
        }
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to clone session');
      }
    } catch (err) {
      alert('An error occurred while cloning the session.');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <>
      <button
        id="clone-session-btn"
        data-testid="clone-session-btn"
        onClick={() => setIsModalOpen(true)}
        disabled={isCloning}
        className={`flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-sm font-bold transition-colors ${isCloning ? 'bg-purple-500/10 text-purple-500/50 cursor-not-allowed border border-purple-500/10' : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 border border-purple-500/30'}`}
      >
        <svg className={`w-4 h-4 ${isCloning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isCloning ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          )}
        </svg>
        {isCloning ? 'Cloning...' : 'Clone Session'}
      </button>

      {isModalOpen && (
        <div data-testid="clone-session-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Clone Session?</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  This will create a new session with identical modules, testcases, and user assignments. Existing execution statuses will be reset.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button
                id="clone-session-cancel-btn"
                data-testid="clone-session-cancel-btn"
                onClick={() => setIsModalOpen(false)}
                disabled={isCloning}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
              >
                Cancel
              </button>
              <button
                id="clone-session-confirm-btn"
                data-testid="clone-session-confirm-btn"
                onClick={handleClone}
                disabled={isCloning}
                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
              >
                {isCloning ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Cloning...
                  </>
                ) : 'Clone Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
