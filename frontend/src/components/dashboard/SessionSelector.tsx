'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type SessionOption = { id: string; name: string };

export function SessionSelector({ currentSession }: { currentSession?: string }) {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/sessions`, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error('Unable to load sessions');
        return res.json();
      })
      .then(json => setSessions(json.data || []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    setIsOpen(false);
    setSearchQuery('');
    router.push(val ? `${pathname}?session=${val}` : pathname);
  };

  const filteredSessions = sessions.filter(session => session.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const currentSessionName = currentSession
    ? sessions.find(session => session.id === currentSession)?.name || (loading ? 'Loading sessions' : 'Unknown session')
    : 'Active sessions';

  return (
    <div
      className="relative z-50 w-full sm:w-[260px]"
      ref={dropdownRef}
      data-testid="session-selector"
      onKeyDown={event => {
        if (event.key === 'Escape') setIsOpen(false);
      }}
    >
      <button
        type="button"
        id="session-selector-btn"
        data-testid="session-selector-btn"
        aria-label={`Session filter: ${currentSessionName}`}
        aria-expanded={isOpen}
        aria-controls="session-selector-menu"
        onClick={() => setIsOpen(value => !value)}
        className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-left text-sm text-slate-300 transition-colors hover:border-indigo-400 active:bg-slate-800"
      >
        <svg className="h-4 w-4 shrink-0 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16M7 12h10m-7 7h4" />
        </svg>
        <span className="min-w-0 flex-1 truncate font-medium" data-testid="session-selector-name">{currentSessionName}</span>
        <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          id="session-selector-menu"
          className="absolute right-0 top-full mt-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-lg"
          data-testid="session-selector-menu"
        >
          <div className="border-b border-slate-700 p-2">
            <label className="sr-only" htmlFor="session-selector-search-input">Search sessions</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
              </svg>
              <input
                id="session-selector-search-input"
                data-testid="session-selector-search-input"
                type="search"
                autoFocus
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search sessions"
                className="min-h-10 w-full rounded-md border border-slate-700 bg-slate-950 pl-9 pr-3 text-sm text-slate-300 placeholder:text-slate-500 focus-visible:outline-indigo-400"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5" data-testid="session-selector-options">
            <button
              type="button"
              id="session-selector-option-active"
              data-testid="session-selector-option-active"
              aria-pressed={!currentSession}
              onClick={() => handleSelect('')}
              className={`min-h-10 w-full rounded-md px-3 text-left text-sm transition-colors hover:bg-slate-800 active:bg-slate-700 ${!currentSession ? 'bg-indigo-950 font-semibold text-indigo-100' : 'text-slate-300'}`}
            >
              Active sessions
            </button>

            {loading ? (
              <p className="px-3 py-4 text-sm text-slate-600" role="status" data-testid="session-selector-loading">Loading sessions…</p>
            ) : loadError ? (
              <p className="px-3 py-4 text-sm text-rose-300" role="alert" data-testid="session-selector-error">Sessions could not be loaded. Refresh the page to try again.</p>
            ) : sessions.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-600" data-testid="session-selector-empty">No sessions are available.</p>
            ) : filteredSessions.length > 0 ? (
              <>
                {filteredSessions.slice(0, 10).map(session => (
                  <button
                    key={session.id}
                    type="button"
                    data-testid={`session-selector-option-${session.id}`}
                    aria-pressed={session.id === currentSession}
                    onClick={() => handleSelect(session.id)}
                    className={`min-h-10 w-full rounded-md px-3 text-left text-sm transition-colors hover:bg-slate-800 active:bg-slate-700 ${session.id === currentSession ? 'bg-indigo-950 font-semibold text-indigo-100' : 'text-slate-300'}`}
                  >
                    <span className="block truncate">{session.name}</span>
                  </button>
                ))}
                {filteredSessions.length > 10 && (
                  <p className="px-3 py-3 text-xs text-slate-600" data-testid="session-selector-more-hint">
                    {filteredSessions.length - 10} more sessions. Refine your search.
                  </p>
                )}
              </>
            ) : (
              <p className="px-3 py-4 text-sm text-slate-600" data-testid="session-selector-no-match">No sessions match your search.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
