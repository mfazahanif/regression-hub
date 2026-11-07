'use client';

import { useState, useEffect } from 'react';
import { EditSessionModal } from './EditSessionModal';

export function EditSessionButton({ session }: { session: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const authData = localStorage.getItem('auth');
    if (authData) {
      try {
        setCurrentUser(JSON.parse(authData).user);
      } catch (e) {}
    }
  }, []);

  if (!session || session.status === 'Finished' || session.status === 'Done' || !currentUser) return null;

  return (
    <>
      <button 
        id="edit-session-btn"
        data-testid="edit-session-btn"
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 px-4 h-10 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold rounded-xl transition-colors border border-indigo-500/30 shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        Edit Session
      </button>
      {isOpen && (
        <EditSessionModal isOpen={isOpen} onClose={() => setIsOpen(false)} session={session} />
      )}
    </>
  );
}
