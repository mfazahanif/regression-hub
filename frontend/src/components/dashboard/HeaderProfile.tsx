'use client';

import { useState, useEffect } from 'react';

export function HeaderProfile() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const authData = localStorage.getItem('auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        setCurrentUser(parsed.user);
      } catch (e) {}
    }
  }, []);

  if (!currentUser) {
    return (
      <div className="header-profile-avatar" data-testid="header-profile-skeleton" aria-label="Loading profile">
        <span aria-hidden="true">···</span>
      </div>
    );
  }

  const initials = currentUser.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className="header-profile-avatar"
      data-testid="header-profile"
      title={`${currentUser.name} · ${currentUser.role || currentUser.email}`}
    >
      <span aria-hidden="true">{initials}</span>
      <span className="sr-only">Signed in as {currentUser.name}, {currentUser.role || currentUser.email}</span>
      <span className="sr-only" data-testid="header-profile-name">{currentUser.name}</span>
      <span className="sr-only" data-testid="header-profile-role">{currentUser.role || currentUser.email}</span>
    </div>
  );
}
