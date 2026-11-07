"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { refreshCurrentSession } from '@/lib/authenticatedFetch';

const ACTIVITY_KEY = 'coreqa_last_activity';

export default function AuthSessionManager() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith('/dashboard')) return;
    const configuredIdleMinutes = Number(getStoredIdleTimeout());
    const idleMs = (configuredIdleMinutes > 0 ? configuredIdleMinutes : 30) * 60 * 1000;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    let refreshing = false;
    let loggingOut = false;

    const logout = async () => {
      if (loggingOut) return;
      loggingOut = true;
      const auth = getAuth();
      if (auth.access_token) {
        try {
          await fetch(`${apiUrl}/auth/signout`, {
            method: 'POST', headers: { Authorization: `Bearer ${auth.access_token}` },
          });
        } catch {}
      }
      localStorage.removeItem('auth');
      localStorage.removeItem(ACTIVITY_KEY);
      document.cookie = 'coreqa_token=; path=/; max-age=0; samesite=strict';
      router.replace('/login');
    };
    const touch = () => localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    const getAuth = () => {
      try { return JSON.parse(localStorage.getItem('auth') || '{}'); } catch { return {}; }
    };
    function getStoredIdleTimeout() {
      try { return JSON.parse(localStorage.getItem('auth') || '{}').idle_timeout_minutes; } catch { return 30; }
    }
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const updatedAuth = await refreshCurrentSession(apiUrl);
        if (!updatedAuth) await logout();
      } catch { /* A transient network failure is retried on the next activity tick. */ }
      finally { refreshing = false; }
    };
    touch();
    const activityEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => window.addEventListener(event, touch, { passive: true }));
    const timer = window.setInterval(() => {
      const lastActivity = Number(localStorage.getItem(ACTIVITY_KEY) || 0);
      if (!lastActivity || Date.now() - lastActivity >= idleMs) return logout();
      if (Date.now() - lastActivity < 70_000) void refresh();
    }, 60_000);
    const checkOnFocus = () => {
      const lastActivity = Number(localStorage.getItem(ACTIVITY_KEY) || 0);
      if (Date.now() - lastActivity >= idleMs) logout();
    };
    window.addEventListener('focus', checkOnFocus);
    return () => {
      window.clearInterval(timer);
      activityEvents.forEach(event => window.removeEventListener(event, touch));
      window.removeEventListener('focus', checkOnFocus);
    };
  }, [pathname, router]);

  return null;
}
