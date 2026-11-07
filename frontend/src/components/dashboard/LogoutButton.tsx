"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      if (auth.access_token) await fetch(`${baseUrl}/auth/signout`, {
        method: 'POST', headers: { Authorization: `Bearer ${auth.access_token}` },
      });
    } catch { /* Local cleanup still signs the user out if the API is unreachable. */ }
    localStorage.removeItem('auth');
    localStorage.removeItem('coreqa_last_activity');
    document.cookie = 'coreqa_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.replace('/login');
  };

  return (
    <>
      <button 
        id="logout-btn"
        data-testid="logout-btn"
        aria-label="Sign out"
        title="Sign out"
        onClick={() => setShowConfirm(true)}
        className="header-icon-button header-signout-button"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" data-testid="logout-modal">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2" data-testid="logout-modal-title">Confirm Logout</h3>
            <p className="text-sm text-slate-300 mb-6" data-testid="logout-modal-description">Are you sure you want to sign out of your account?</p>
            
            <div className="flex w-full gap-3">
              <button 
                id="logout-cancel-btn"
                data-testid="logout-cancel-btn"
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                id="logout-confirm-btn"
                data-testid="logout-confirm-btn"
                onClick={handleLogout}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition-colors"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
