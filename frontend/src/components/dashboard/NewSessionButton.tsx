'use client';

import { useEffect, useState } from 'react';
import { CreateSessionModal } from './CreateSessionModal';

export function NewSessionButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    try {
      const authData = JSON.parse(localStorage.getItem('auth') || '{}');
      setCanCreate(!!authData.user);
    } catch {}
  }, []);

  if (!canCreate) return null;

  return (
    <>
      <button
        id="sidebar-new-session-btn"
        data-testid="sidebar-new-session-btn"
        onClick={() => setIsModalOpen(true)}
        className="min-h-11 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors"
      >
        New Session
      </button>
      <CreateSessionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
