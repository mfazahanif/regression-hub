"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  // const [email, setEmail] = useState('qa1@coreqa.com');
  // const [password, setPassword] = useState('CoreQA_2026!Sec');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.message || 'Login failed');
      }

      document.cookie = `coreqa_token=${json.data.access_token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=strict`;
      localStorage.setItem('auth', JSON.stringify(json.data));
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-100 px-4" data-testid="login-page">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      
      <div className="relative z-10 w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-sm" data-testid="login-card">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-5" data-testid="login-brand-logo">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight" data-testid="login-title">Regression Hub</h1>
          <p className="text-slate-500 mt-2 text-sm" data-testid="login-subtitle">Masuk untuk mengelola regression</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm font-medium text-center" id="login-error-message" data-testid="login-error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5" id="login-form" data-testid="login-form">
          <div>
            <label htmlFor="login-email-input" className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
            <input 
              id="login-email-input"
              data-testid="login-email-input"
              name="email"
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              placeholder="you@example.com"
              autoComplete="off"
              required
            />
          </div>
          
          <div>
            <label htmlFor="login-password-input" className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <div className="relative">
              <input 
                id="login-password-input"
                data-testid="login-password-input"
                name="password"
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 pr-12 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              {password && (
                <button
                  type="button"
                  id="login-toggle-password-btn"
                  data-testid="login-toggle-password-btn"
                  onClick={() => setShowPassword(value => !value)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.98 8.52A10.48 10.48 0 0 0 2.25 12c1.5 3.5 5.25 6 9.75 6a10.48 10.48 0 0 0 5.77-1.73M6.23 6.23A10.45 10.45 0 0 1 12 4c4.5 0 8.25 2.5 9.75 6a10.5 10.5 0 0 1-2.16 3.45M3 3l18 18M9.88 9.88A3 3 0 0 0 14.12 14.12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.25 12c1.5-3.5 5.25-6 9.75-6s8.25 2.5 9.75 6c-1.5 3.5-5.25 6-9.75 6s-8.25-2.5-9.75-6Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            id="login-submit-btn"
            data-testid="login-submit-btn"
            disabled={loading}
            className="w-full mt-2 bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2 transition-colors"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" data-testid="login-loading-spinner"></span>
            ) : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-8 text-center text-slate-600 text-xs font-semibold tracking-wide uppercase">
          Internal QA - PT. Mitra Bhakti Informasi
        </div>
      </div>
    </div>
  );
}
