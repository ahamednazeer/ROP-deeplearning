'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  ImageSquare,
  UserCircle,
  GaugeIcon,
  ArrowRight,
  ChartBar,
} from '@phosphor-icons/react';
import DataCard from '@/components/DataCard';
import api, { type Stats } from '@/lib/api';

export default function AdminOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  const stageOrder = [
    'Normal', 'Stage 0', 'Stage 1', 'Stage 2', 'Stage 3', 'Stage 3A',
    'Stage 3B', 'Stage 4', 'Stage 4A', 'Stage 4B', 'Stage 5',
  ];

  const maxStageCount = stats?.by_stage
    ? Math.max(...Object.values(stats.by_stage), 1)
    : 1;

  const doctorCount = stats?.by_role?.DOCTOR ?? stats?.by_role?.doctor ?? 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <GaugeIcon size={24} className="text-blue-400" />
        <div>
          <h1
            className="text-xl font-black tracking-widest uppercase text-slate-100"
            style={{ fontFamily: "'Chivo', sans-serif" }}
          >
            Administration
          </h1>
          <p className="text-xs text-slate-500 font-mono tracking-wider">System overview & statistics</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-slate-500">
          <span className="w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
          <span className="text-sm font-mono">Loading statistics...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-950/30 border border-red-800/40 rounded-sm px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DataCard
              title="Total Users"
              value={stats.total_users}
              icon={<Users size={20} />}
              subtitle="Registered accounts"
              colorClass="text-blue-400"
            />
            <DataCard
              title="Total Patients"
              value={stats.total_patients}
              icon={<UserCircle size={20} />}
              subtitle="Registered patients"
              colorClass="text-purple-400"
            />
            <DataCard
              title="Total Scans"
              value={stats.total_predictions}
              icon={<ImageSquare size={20} />}
              subtitle="AI predictions made"
              colorClass="text-teal-400"
            />
            <DataCard
              title="Active Doctors"
              value={doctorCount}
              icon={<UserCircle size={20} />}
              subtitle="Medical staff"
              colorClass="text-green-400"
            />
          </div>

          {/* Stage distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <ChartBar size={18} className="text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase font-display">
                  ROP Stage Distribution
                </h2>
              </div>
              <div className="space-y-2.5">
                {stageOrder.map((stage) => {
                  const count = stats.by_stage?.[stage] ?? 0;
                  const pct = Math.round((count / maxStageCount) * 100);
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400 w-20 flex-shrink-0 truncate">{stage}</span>
                      <div className="flex-1 progress-bar">
                        <div
                          className="progress-bar-fill bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-400 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Role breakdown */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} className="text-purple-400" />
                <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase font-display">
                  User Role Breakdown
                </h2>
              </div>
              <div className="space-y-3">
                {Object.entries(stats.by_role ?? {}).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-sm border border-slate-700/30">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${role.toUpperCase() === 'ADMIN' ? 'bg-purple-400' : 'bg-blue-400'}`} />
                      <span className="text-sm font-mono text-slate-300">{role.toUpperCase()}</span>
                    </div>
                    <span className={`text-lg font-bold ${role.toUpperCase() === 'ADMIN' ? 'text-purple-400' : 'text-blue-400'}`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-4 border-t border-slate-700/40">
                <p className="label-mono mb-3">Quick Actions</p>
                <button
                  onClick={() => router.push('/dashboard/admin/users')}
                  className="btn-primary w-full justify-between"
                >
                  <span>Manage Users</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
