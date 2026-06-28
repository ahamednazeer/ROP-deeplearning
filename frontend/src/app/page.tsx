'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeSlash, Lock, User, Warning } from '@phosphor-icons/react';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If already logged in, redirect
    const token = api.getToken();
    if (token) {
      const cached = localStorage.getItem('rop_user');
      if (cached) {
        try {
          const u = JSON.parse(cached);
          if (u.role === 'ADMIN') router.push('/dashboard/admin');
          else router.push('/dashboard/doctor');
        } catch {
          api.clearToken();
        }
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const data = await api.login(username, password);
      if (data.user.role === 'ADMIN') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard/doctor');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Scanlines */}
      <div className="scanlines" />

      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(59,130,246,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.8) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-sm mx-4 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Eye icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-sm mb-4
            bg-slate-800/80 border border-blue-500/40"
            style={{ boxShadow: '0 0 30px rgba(59,130,246,0.3)' }}
          >
            <Eye size={32} weight="duotone" className="text-blue-400" />
          </div>
          <h1
            className="text-2xl font-black tracking-widest uppercase text-slate-100 mb-1"
            style={{ fontFamily: "'Chivo', sans-serif" }}
          >
            ROP Detection System
          </h1>
          <p className="text-xs text-slate-500 tracking-wider uppercase font-mono">
            AI-Powered Neonatal Eye Disease Screening
          </p>

          {/* Status bar */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
              System Online
            </span>
          </div>
        </div>

        {/* Form card */}
        <div
          className="bg-slate-900/80 border border-slate-700/60 rounded-sm p-6 backdrop-blur-xl"
          style={{ boxShadow: '0 0 40px rgba(0,0,0,0.4), 0 0 80px rgba(59,130,246,0.05)' }}
        >
          <p className="label-mono mb-4 text-center">Authentication Required</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="label-mono block mb-1.5">Username</label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="input-modern pl-9"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label-mono block mb-1.5">Password</label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="input-modern pl-9 pr-10"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/50 rounded-sm px-3 py-2">
                <Warning size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Eye size={16} />
                  Access System
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="mt-4 bg-slate-900/50 border border-slate-700/40 rounded-sm p-4">
          <p className="label-mono mb-2">Demo Credentials</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">ADMIN</span>
              <span className="text-slate-400">
                admin / <span className="text-blue-400">admin123</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">DOCTOR</span>
              <span className="text-slate-400">
                doctor / <span className="text-blue-400">doctor123</span>
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-600 mt-4 font-mono tracking-wider">
          ROP DETECTION v1.0 • SECURE ACCESS
        </p>
      </div>
    </div>
  );
}
