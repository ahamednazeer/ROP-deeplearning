'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  Upload,
  Users,
  ClipboardText,
  GaugeIcon,
  ArrowRight,
  UserCircle,
} from '@phosphor-icons/react';
import DataCard from '@/components/DataCard';
import api, { type User, type Patient, type Prediction } from '@/lib/api';

function getSeverityClass(severity: string): string {
  const s = severity?.toLowerCase() ?? 'normal';
  if (s === 'normal') return 'severity-normal';
  if (s === 'mild') return 'severity-mild';
  if (s === 'moderate') return 'severity-moderate';
  if (s === 'severe') return 'severity-severe';
  if (s === 'critical') return 'severity-critical';
  return 'severity-normal';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export default function DoctorOverviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem('rop_user');
    if (cached) {
      try { setUser(JSON.parse(cached) as User); } catch { /* ignore */ }
    }

    Promise.all([api.getPatients(), api.getPredictions()])
      .then(([p, pr]) => {
        setPatients(p);
        setPredictions(pr);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const todayScans = predictions.filter((p) => isToday(p.created_at)).length;
  const recent = predictions.slice(0, 5);

  // Most common finding
  const stageCounts = predictions.reduce<Record<string, number>>((acc, p) => {
    acc[p.rop_stage] = (acc[p.rop_stage] ?? 0) + 1;
    return acc;
  }, {});
  const mostCommon = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';

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
            Welcome, {user?.full_name?.split(' ')[0] ?? 'Doctor'}
          </h1>
          <p className="text-xs text-slate-500 font-mono tracking-wider">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-500">
          <span className="w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
          <span className="text-sm font-mono">Loading dashboard...</span>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DataCard
              title="My Patients"
              value={patients.length}
              icon={<UserCircle size={20} />}
              subtitle="Registered patients"
              colorClass="text-purple-400"
            />
            <DataCard
              title="Total Scans"
              value={predictions.length}
              icon={<Eye size={20} />}
              subtitle="AI predictions made"
              colorClass="text-blue-400"
            />
            <DataCard
              title="Today's Scans"
              value={todayScans}
              icon={<Upload size={20} />}
              subtitle="Processed today"
              colorClass="text-teal-400"
            />
            <DataCard
              title="Top Finding"
              value={mostCommon}
              icon={<ClipboardText size={20} />}
              subtitle="Most common stage"
              colorClass="text-orange-400"
            />
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent predictions */}
            <div className="lg:col-span-2 card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardText size={18} className="text-blue-400" />
                  <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase font-display">
                    Recent Scans
                  </h2>
                </div>
                <button
                  onClick={() => router.push('/dashboard/doctor/history')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1 transition-colors"
                >
                  View All <ArrowRight size={12} />
                </button>
              </div>

              {recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                  <Eye size={32} className="mb-2 opacity-40" />
                  <p className="text-sm font-mono">No scans yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recent.map((pred) => (
                    <div
                      key={pred.id}
                      className="flex items-center justify-between p-3 bg-slate-800/30 rounded-sm border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-sm bg-slate-700/60 flex items-center justify-center flex-shrink-0">
                          <Eye size={14} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{pred.patient_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{formatDate(pred.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400">
                          {((pred.stage_prob ?? pred.confidence ?? 0) * 100).toFixed(1)}%
                        </span>
                        <span className={getSeverityClass(pred.severity)}>{pred.rop_stage}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <GaugeIcon size={18} className="text-teal-400" />
                <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase font-display">
                  Quick Actions
                </h2>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/dashboard/doctor/upload')}
                  className="btn-primary w-full justify-between"
                >
                  <span className="flex items-center gap-2"><Upload size={15} />New Scan</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => router.push('/dashboard/doctor/patients')}
                  className="btn-secondary w-full justify-between"
                >
                  <span className="flex items-center gap-2"><Users size={15} />Add Patient</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => router.push('/dashboard/doctor/history')}
                  className="btn-secondary w-full justify-between"
                >
                  <span className="flex items-center gap-2"><ClipboardText size={15} />View History</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Patient stat */}
              <div className="mt-6 pt-4 border-t border-slate-700/40">
                <p className="label-mono mb-3">Patient Summary</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-mono">Total Patients</span>
                    <span className="text-slate-300 font-mono">{patients.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-mono">Total Scans</span>
                    <span className="text-slate-300 font-mono">{predictions.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-mono">Avg per Patient</span>
                    <span className="text-slate-300 font-mono">
                      {patients.length > 0 ? (predictions.length / patients.length).toFixed(1) : '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
