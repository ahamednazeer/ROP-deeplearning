'use client';

import React from 'react';
import { Network, Brain, Cpu } from '@phosphor-icons/react';

const resultImages = [
  '__results___14_1.png',
  '__results___14_3.png',
  '__results___14_5.png',
  '__results___15_0.png',
  '__results___15_2.png',
  '__results___15_4.png',
];

export default function ResultsPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-slide-up space-y-8">
      <div>
        <h1 
          className="text-2xl font-black tracking-widest uppercase text-slate-100 mb-2"
          style={{ fontFamily: "'Chivo', sans-serif" }}
        >
          Trained Model Details
        </h1>
        <p className="text-slate-400">
          Architecture overview, multi-task learning configuration, and performance visualizations of the deep learning model.
        </p>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Architecture Card */}
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-sm p-5 backdrop-blur-xl hover:border-blue-500/40 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-sm bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
              <Network size={24} className="text-blue-400" />
            </div>
            <h3 className="font-semibold text-slate-200">Architecture</h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-400 font-mono">
            <li><span className="text-slate-300">Dual Stream Backbone</span></li>
            <li>• CNN: EfficientNet-B3 (Local)</li>
            <li>• ViT: Swin-Tiny (Global)</li>
            <li>• Fused Dimension: 1024</li>
            <li>• Input Size: 224x224 RGB</li>
          </ul>
        </div>

        {/* Multi-Task Learning Card */}
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-sm p-5 backdrop-blur-xl hover:border-purple-500/40 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-sm bg-purple-600/20 border border-purple-500/40 flex items-center justify-center">
              <Brain size={24} className="text-purple-400" />
            </div>
            <h3 className="font-semibold text-slate-200">Multi-Task Targets</h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-400 font-mono">
            <li><span className="text-slate-300">Outputs (3 Tasks):</span></li>
            <li>• Stage: 4 classes (0 to 3)</li>
            <li>• Zone: 3 classes (I, II, III)</li>
            <li>• Plus Disease: Binary</li>
            <li><span className="text-slate-300">Metadata Injected:</span></li>
            <li>• Gestational age, weight, sex</li>
          </ul>
        </div>

        {/* Training Configuration Card */}
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-sm p-5 backdrop-blur-xl hover:border-green-500/40 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-sm bg-green-600/20 border border-green-500/40 flex items-center justify-center">
              <Cpu size={24} className="text-green-400" />
            </div>
            <h3 className="font-semibold text-slate-200">Training Setup</h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-400 font-mono">
            <li><span className="text-slate-300">Loss & Optimization</span></li>
            <li>• Uncertainty Weighted Loss</li>
            <li>• Optimizer: Adam (LR 2e-4)</li>
            <li>• Class-weighted Cross Entropy</li>
            <li>• Scheduler: Cosine Annealing</li>
            <li>• Image Augmentation applied</li>
          </ul>
        </div>

        {/* Performance & Accuracy Card */}
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-sm p-5 backdrop-blur-xl hover:border-yellow-500/40 transition-colors" style={{ boxShadow: 'inset 0 0 20px rgba(234, 179, 8, 0.05)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-sm bg-yellow-600/20 border border-yellow-500/40 flex items-center justify-center">
              <span className="text-yellow-400 font-black tracking-tighter">90+</span>
            </div>
            <h3 className="font-semibold text-slate-200">Test Accuracy</h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-400 font-mono">
            <li><span className="text-slate-300">Test Set Metrics (N=268)</span></li>
            <li>
              • Stage Accuracy: <span className="text-yellow-400 font-bold">97.39%</span>
            </li>
            <li>
              • Zone Accuracy: <span className="text-yellow-400 font-bold">100.00%</span>
            </li>
            <li>
              • Plus Accuracy: <span className="text-yellow-400 font-bold">100.00%</span>
            </li>
            <li className="pt-1 mt-1 border-t border-slate-700/50 text-[11px] leading-tight">
              Perfect zone/plus predictions. Slight S0/S2 confusion on stage.
            </li>
          </ul>
        </div>

      </div>

      <div className="pt-6 border-t border-slate-700/60">
        <h2 
          className="text-xl font-bold tracking-widest uppercase text-slate-100 mb-6"
          style={{ fontFamily: "'Chivo', sans-serif" }}
        >
          Model Visualizations
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {resultImages.map((img, idx) => (
            <div 
              key={idx} 
              className="bg-slate-900/80 border border-slate-700/60 rounded-sm overflow-hidden flex flex-col backdrop-blur-xl group hover:border-blue-500/40 transition-colors"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
            >
              <div className="p-3 border-b border-slate-700/60 bg-slate-800/40 flex items-center justify-between">
                <p className="text-xs font-mono text-slate-300">Output Log: {img}</p>
                <div className="w-2 h-2 rounded-full bg-blue-500/50" />
              </div>
              <div className="relative w-full aspect-[4/3] p-4 flex items-center justify-center bg-slate-950/50">
                <img
                  src={`/results/${img}`}
                  alt={`Training Result ${idx}`}
                  className="max-w-full max-h-full object-contain rounded-sm"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
