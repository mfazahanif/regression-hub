'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteSessionButton({ session }: { session: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Role Check
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

  if (!session || role === null) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const authStr = JSON.parse(localStorage.getItem('auth') || '{}');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/sessions/${session.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authStr.access_token}` }
      });
      if (res.ok) {
        setIsModalOpen(false);
        router.push('/dashboard/sessions');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete session');
      }
    } catch (err) {
      alert('An error occurred while deleting the session.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        id="delete-session-btn"
        data-testid="delete-session-btn"
        onClick={() => setIsModalOpen(true)}
        disabled={isDeleting}
        className="flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-sm font-bold transition-colors bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30"
      >
        <svg className={`w-4 h-4 ${isDeleting ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>

      {isModalOpen && (
        <div data-testid="delete-session-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Delete Session?</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Are you sure you want to delete <strong className="text-white">"{session.name}"</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button
                id="delete-session-cancel-btn"
                data-testid="delete-session-cancel-btn"
                onClick={() => setIsModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
              >
                Cancel
              </button>
              <button
                id="delete-session-confirm-btn"
                data-testid="delete-session-confirm-btn"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-[0_0_15px_rgba(225,29,72,0.3)]"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
