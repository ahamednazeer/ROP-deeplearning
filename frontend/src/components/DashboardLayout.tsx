'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  GaugeIcon,
  Upload,
  Users,
  ClipboardText,
  SignOut,
  List,
  X,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import type { User } from '@/lib/api';
import api from '@/lib/api';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', href: '/dashboard/admin', icon: <GaugeIcon size={18} /> },
  { label: 'Users', href: '/dashboard/admin/users', icon: <Users size={18} /> },
];

const DOCTOR_NAV: NavItem[] = [
  { label: 'Overview', href: '/dashboard/doctor', icon: <GaugeIcon size={18} /> },
  { label: 'New Scan', href: '/dashboard/doctor/upload', icon: <Upload size={18} /> },
  { label: 'Patients', href: '/dashboard/doctor/patients', icon: <Users size={18} /> },
  { label: 'History', href: '/dashboard/doctor/history', icon: <ClipboardText size={18} /> },
];

const SIDEBAR_MIN = 56;
const SIDEBAR_DEFAULT = 240;
const SIDEBAR_MAX = 320;

interface Props {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(SIDEBAR_DEFAULT);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(SIDEBAR_DEFAULT);

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      router.push('/');
      return;
    }

    // Load user from localStorage first
    const cached = localStorage.getItem('rop_user');
    if (cached) {
      try {
        setUser(JSON.parse(cached) as User);
      } catch {
        // ignore
      }
    }

    // Verify token with server
    api.getMe().then(setUser).catch(() => {
      api.clearToken();
      router.push('/');
    });

    // Restore sidebar state
    const savedWidth = localStorage.getItem('rop_sidebar_width');
    const savedCollapsed = localStorage.getItem('rop_sidebar_collapsed');
    if (savedWidth) setSidebarWidth(parseInt(savedWidth, 10));
    if (savedCollapsed) setCollapsed(savedCollapsed === 'true');
  }, [router]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth.current + delta));
      setSidebarWidth(newWidth);
      if (newWidth <= SIDEBAR_MIN + 20) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    const handleMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const width = startWidth.current;
      localStorage.setItem('rop_sidebar_width', String(sidebarWidth));
      localStorage.setItem('rop_sidebar_collapsed', String(collapsed));
      void width;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [collapsed, sidebarWidth]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    const newWidth = next ? SIDEBAR_MIN : SIDEBAR_DEFAULT;
    setSidebarWidth(newWidth);
    localStorage.setItem('rop_sidebar_collapsed', String(next));
    localStorage.setItem('rop_sidebar_width', String(newWidth));
  };

  const handleLogout = () => {
    api.clearToken();
    router.push('/');
  };

  const navItems = user?.role === 'ADMIN' ? ADMIN_NAV : DOCTOR_NAV;
  const effectiveWidth = collapsed ? SIDEBAR_MIN : sidebarWidth;

  const SidebarContent = () => (
    <div
      className="flex flex-col h-full"
      style={{ width: effectiveWidth, minWidth: effectiveWidth, maxWidth: effectiveWidth }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-slate-700/60">
        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-sm bg-blue-600/20 border border-blue-500/40">
          <Eye size={16} className="text-blue-400" weight="duotone" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-100 font-display truncate">
              ROP Detection
            </p>
            <p className="text-[10px] text-slate-500 tracking-wider truncate">AI Screening System</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {!collapsed && (
          <p className="label-mono px-2 py-2">
            {user?.role === 'ADMIN' ? 'Admin' : 'Doctor'}
          </p>
        )}
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard/admin' && item.href !== '/dashboard/doctor' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-2 py-2.5 rounded-sm text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'nav-active'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border-l-2 border-transparent'
                }`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-700/60 p-2 space-y-1">
        {!collapsed && user && (
          <div className="px-2 py-2">
            <p className="text-xs font-semibold text-slate-300 truncate">{user.full_name}</p>
            <p className="text-[10px] text-slate-500 truncate">{user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign Out' : undefined}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-sm text-sm text-slate-500
            hover:text-red-400 hover:bg-red-950/30 transition-all duration-150 border-l-2 border-transparent"
        >
          <SignOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col relative bg-slate-900 border-r border-slate-700/60 transition-none flex-shrink-0"
        style={{ width: effectiveWidth }}
      >
        <SidebarContent />

        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/40 transition-colors group z-10"
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-1 h-8 bg-blue-500/60 rounded-full" />
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-6 z-20 w-6 h-6 rounded-full bg-slate-800 border border-slate-700
            flex items-center justify-center text-slate-400 hover:text-blue-400 hover:border-blue-500 transition-all shadow-lg"
        >
          {collapsed ? <CaretRight size={10} /> : <CaretLeft size={10} />}
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-slate-700/60 z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-slate-900/80 border-b border-slate-700/60 flex items-center justify-between px-4 md:px-6 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 rounded-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              onClick={() => setMobileOpen(true)}
            >
              <List size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Eye size={18} className="text-blue-400" weight="duotone" />
              <span className="text-sm font-semibold tracking-widest uppercase text-slate-200 font-display">
                ROP Detection System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-slate-300">{user.full_name}</p>
                <p className="text-[10px] text-slate-500 font-mono">{user.role}</p>
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-400">
                {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
