'use client';

import React from 'react';

interface DataCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  colorClass?: string;
}

export default function DataCard({ title, value, icon, subtitle, colorClass = 'text-blue-400' }: DataCardProps) {
  return (
    <div className="card p-5 flex items-start gap-4 animate-slide-up hover:border-slate-600 transition-colors">
      <div className={`p-3 rounded-sm bg-slate-900/60 border border-slate-700/40 ${colorClass}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="label-mono mb-1">{title}</p>
        <p className={`text-2xl font-bold font-display tracking-tight ${colorClass}`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
