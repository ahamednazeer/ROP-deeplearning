'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  Upload,
  CheckCircle,
  Warning,
  ArrowLeft,
  ClipboardText,
  ScanSmiley,
  Spinner,
  ImageSquare,
} from '@phosphor-icons/react';
import api, { type Patient, type Prediction } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── Severity helpers ────────────────────────────────────────────────────────

function getSeverityClass(severity: string): string {
  const s = (severity ?? '').toLowerCase();
  if (s === 'normal') return 'severity-normal';
  if (s === 'mild') return 'severity-mild';
  if (s === 'moderate') return 'severity-moderate';
  if (s === 'severe') return 'severity-severe';
  if (s === 'critical') return 'severity-critical';
  return 'severity-normal';
}

function getSeverityColor(severity: string): string {
  const s = (severity ?? '').toLowerCase();
  if (s === 'normal') return '#4ade80';
  if (s === 'mild') return '#facc15';
  if (s === 'moderate') return '#fb923c';
  if (s === 'severe') return '#f87171';
  if (s === 'critical') return '#fca5a5';
  return '#4ade80';
}

function getRecommendation(severity: string): { text: string; urgent: boolean } {
  const s = (severity ?? '').toLowerCase();
  if (s === 'normal') return { text: 'No ROP detected. Continue routine monitoring per standard neonatal care protocol.', urgent: false };
  if (s === 'mild') return { text: 'Stage 1-2 ROP detected. Monitor closely — follow-up examination recommended within 1–2 weeks.', urgent: false };
  if (s === 'moderate') return { text: 'Moderate ROP detected. Ophthalmologist review strongly recommended within 1 week.', urgent: false };
  if (s === 'severe') return { text: 'Severe ROP detected. Urgent ophthalmologist consultation required within 24–48 hours.', urgent: true };
  if (s === 'critical') return { text: 'CRITICAL: Immediate medical intervention required. Contact specialist NOW. Risk of permanent vision loss.', urgent: true };
  return { text: 'Analysis complete. Please consult with a specialist for interpretation.', urgent: false };
}

// ─── Stage 3 uncertainty detection ───────────────────────────────────────────
// The model has only 37.5% recall for Stage 3 (very rare class: 252/6004 training images).
// When Stage 4-5 is the top prediction but Stage 3 also has ≥5% probability,
// we warn the clinician that Stage 3 may have been misclassified.
function getStage3Warning(stage: number | undefined, allProbs: Record<string, number>): string | null {
  if (stage !== 3) return null; // only relevant when model predicts Stage 4-5 (class 3)
  const stage3Prob = allProbs['Stage 3'] ?? 0;
  if (stage3Prob >= 0.05) {
    return `Model Uncertainty Notice: Stage 3 (ROP) probability is ${(stage3Prob * 100).toFixed(1)}%. The AI model has known low sensitivity for Stage 3 (37.5% recall in validation). Consider Stage 3 ROP as a possible differential diagnosis and verify with a specialist.`;
  }
  return null;
}

function getSeverityIcon(severity: string): React.ReactNode {
  const s = (severity ?? '').toLowerCase();
  if (s === 'normal') return <CheckCircle size={32} className="text-green-400" />;
  if (s === 'mild') return <Eye size={32} className="text-yellow-400" />;
  if (s === 'moderate') return <Eye size={32} className="text-orange-400" />;
  if (s === 'severe' || s === 'critical') return <Warning size={32} className="text-red-400" />;
  return <Eye size={32} className="text-blue-400" />;
}

function formatZone(zone?: number) {
  if (zone === 0) return 'I';
  if (zone === 1) return 'II';
  if (zone === 2) return 'III';
  return zone;
}

function formatStage(stage?: number, rop_stage?: string) {
  if (stage === 0) return 'Normal';
  if (stage === 1) return 'Stage 1-2';
  if (stage === 2) return 'Stage 3';
  if (stage === 3) return 'Stage 4-5';
  if (stage !== undefined) return `Stage ${stage}`;
  return rop_stage;
}

// ─── Main Component ──────────────────────────────────────────────────────────


type Step = 'select' | 'loading' | 'result';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('select');
  const [dragOver, setDragOver] = useState(false);

  // Form state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  // Loading state
  const [loadingText, setLoadingText] = useState('Initializing AI model...');
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Result state
  const [result, setResult] = useState<Prediction | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  // Fetch patients on mount
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState(false);

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    api.getPatients()
      .then((data) => {
        setPatients(data);
        setPatientsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setPatientsError(true);
        setPatientsLoading(false);
      });
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPEG, PNG, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError('File is too large. Maximum size is 10MB.');
      return;
    }
    setImageFile(file);
    setFormError('');
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
  }, [imagePreview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const simulateProgress = () => {
    const steps = [
      { pct: 15, text: 'Preprocessing retinal image...' },
      { pct: 35, text: 'Extracting features with deep learning...' },
      { pct: 60, text: 'Running ROP classification model...' },
      { pct: 80, text: 'Computing stage probabilities...' },
      { pct: 95, text: 'Generating clinical report...' },
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i].pct);
        setLoadingText(steps[i].text);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 700);
    progressInterval.current = interval;
    return interval;
  };

  const handleSubmit = async () => {
    if (!imageFile) { setFormError('Please select an image to analyze.'); return; }
    if (!patientId) { setFormError('Please select a patient.'); return; }
    setFormError('');
    setAnalysisError('');
    setStep('loading');
    setProgress(5);
    setLoadingText('Initializing AI model...');

    const interval = simulateProgress();

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('patient_id', patientId);
    if (notes.trim()) formData.append('notes', notes.trim());

    try {
      const prediction = await api.uploadPrediction(formData);
      clearInterval(interval);
      setProgress(100);
      setLoadingText('Analysis complete!');
      setTimeout(() => {
        setResult(prediction);
        setStep('result');
      }, 500);
    } catch (err: unknown) {
      clearInterval(interval);
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      setStep('select');
    }
  };

  const handleReset = () => {
    setStep('select');
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setPatientId('');
    setNotes('');
    setResult(null);
    setAnalysisError('');
    setFormError('');
    setProgress(0);
  };

  // ─── Step: Loading ─────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full animate-fade-in">
          {/* Animated eye */}
          <div className="relative inline-flex items-center justify-center mb-8">
            <div
              className="w-24 h-24 rounded-full border-2 border-blue-500/30 flex items-center justify-center"
              style={{ boxShadow: '0 0 40px rgba(59,130,246,0.3)' }}
            >
              <div className="w-20 h-20 rounded-full border border-blue-400/20 flex items-center justify-center spin-slow">
                <div className="w-16 h-16 rounded-full border border-blue-400/40 flex items-center justify-center">
                  <Eye size={28} className="text-blue-400 analyzing-pulse" weight="duotone" />
                </div>
              </div>
            </div>
            {/* Orbiting dot */}
            <div
              className="absolute w-3 h-3 rounded-full bg-blue-400"
              style={{
                animation: 'spin-slow 2s linear infinite',
                transformOrigin: '48px center',
                top: '50%',
                left: '50%',
                marginTop: '-6px',
                marginLeft: '-6px',
              }}
            />
          </div>

          <h2
            className="text-lg font-black tracking-widest uppercase text-slate-100 mb-2"
            style={{ fontFamily: "'Chivo', sans-serif" }}
          >
            Analyzing Retinal Image
          </h2>
          <p className="text-sm text-slate-400 font-mono mb-6">{loadingText}</p>

          {/* Progress bar */}
          <div className="progress-bar mb-2">
            <div
              className="progress-bar-fill bg-blue-500"
              style={{
                width: `${progress}%`,
                boxShadow: '0 0 8px rgba(59,130,246,0.6)',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <p className="text-xs text-slate-500 font-mono">{progress}%</p>

          <div className="mt-6 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-blue-400"
                style={{ animation: `analyzing 1.2s ease-in-out ${i * 0.3}s infinite` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: Result ──────────────────────────────────────────────────────────
  if (step === 'result' && result) {
    const recommendation = getRecommendation(result.severity);
    const severityColor = getSeverityColor(result.severity);
    const imageUrl = result.image_filename
      ? `${API_BASE}/static/uploads/${result.image_filename}`
      : null;

    let probsObj: Record<string, number> = {};
    if (typeof result.all_probabilities === 'string') {
      try {
        const parsed = JSON.parse(result.all_probabilities);
        if (parsed.stage && Array.isArray(parsed.stage)) {
          const stageNames = ["Normal", "Stage 1-2", "Stage 3", "Stage 4-5"];
          parsed.stage.forEach((p: number, i: number) => {
            if (stageNames[i]) probsObj[stageNames[i]] = p;
          });
        }
      } catch (e) {}
    } else if (result.all_probabilities) {
      probsObj = result.all_probabilities as unknown as Record<string, number>;
    }
    const sortedProbs = Object.entries(probsObj).sort((a, b) => b[1] - a[1]);
    const topStage = sortedProbs[0]?.[0] ?? result.rop_stage;
    const stage3Warning = getStage3Warning(result.stage, probsObj);

    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={handleReset} className="btn-secondary py-2 px-3">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <CheckCircle size={22} className="text-blue-400" />
            <h1
              className="text-xl font-black tracking-widest uppercase text-slate-100"
              style={{ fontFamily: "'Chivo', sans-serif" }}
            >
              AI Analysis Complete
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main result card */}
          <div className="lg:col-span-2 space-y-5">
            {/* Stage card */}
            <div
              className="card p-6 border"
              style={{ borderColor: `${severityColor}30` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="label-mono mb-2">AI Analysis Results</p>
                  <div className="flex flex-wrap items-center gap-4 mb-2">
                    {getSeverityIcon(result.severity)}
                    <div>
                      <h2
                        className="text-2xl font-black tracking-tight"
                        style={{ fontFamily: "'Chivo', sans-serif", color: severityColor }}
                      >
                        {formatStage(result.stage, result.rop_stage)}
                      </h2>
                      {result.stage_prob !== undefined && (
                        <p className="text-xs font-mono text-slate-400">{(result.stage_prob * 100).toFixed(1)}%</p>
                      )}
                    </div>
                    {result.zone !== undefined && (
                      <>
                        <div className="w-px h-8 bg-slate-700/50" />
                        <div>
                          <h2
                            className="text-2xl font-black tracking-tight"
                            style={{ fontFamily: "'Chivo', sans-serif", color: severityColor }}
                          >
                            Zone {formatZone(result.zone)}
                          </h2>
                          {result.zone_prob !== undefined && (
                            <p className="text-xs font-mono text-slate-400">{(result.zone_prob * 100).toFixed(1)}%</p>
                          )}
                        </div>
                      </>
                    )}
                    {result.plus_disease !== undefined && (
                      <>
                        <div className="w-px h-8 bg-slate-700/50" />
                        <div>
                          <h2
                            className="text-2xl font-black tracking-tight"
                            style={{ fontFamily: "'Chivo', sans-serif", color: severityColor }}
                          >
                            {result.plus_disease === 1 ? 'Plus' : 'No Plus'}
                          </h2>
                          {result.plus_prob !== undefined && (
                            <p className="text-xs font-mono text-slate-400">{(result.plus_prob * 100).toFixed(1)}%</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <span className={getSeverityClass(result.severity)}>{result.severity}</span>
                </div>
                <div className="text-right ml-4">
                  <p className="label-mono mb-1">Patient</p>
                  <p className="text-sm font-semibold text-slate-200">{result.patient_name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {new Date(result.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="label-mono">Confidence Score</span>
                  <span
                    className="text-xl font-bold font-mono"
                    style={{ color: severityColor }}
                  >
                    {((result.stage_prob ?? result.confidence ?? 0) * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="progress-bar" style={{ height: '8px' }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${(result.stage_prob ?? result.confidence ?? 0) * 100}%`,
                      background: `linear-gradient(90deg, ${severityColor}80, ${severityColor})`,
                      boxShadow: `0 0 10px ${severityColor}50`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div
              className={`rounded-sm p-4 border ${
                recommendation.urgent
                  ? 'bg-red-950/30 border-red-800/50'
                  : 'bg-slate-800/30 border-slate-700/40'
              }`}
            >
              <div className="flex items-start gap-3">
                {recommendation.urgent ? (
                  <Warning size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`label-mono mb-1 ${recommendation.urgent ? 'text-red-500' : 'text-slate-500'}`}>
                    Clinical Recommendation
                  </p>
                  <p className={`text-sm leading-relaxed ${recommendation.urgent ? 'text-red-300 font-semibold' : 'text-slate-300'}`}>
                    {recommendation.text}
                  </p>
                </div>
              </div>
            </div>

            {/* Stage 3 uncertainty warning */}
            {stage3Warning && (
              <div className="rounded-sm p-4 border bg-amber-950/30 border-amber-700/50">
                <div className="flex items-start gap-3">
                  <Warning size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="label-mono mb-1 text-amber-500">AI Model Uncertainty</p>
                    <p className="text-sm leading-relaxed text-amber-300">{stage3Warning}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Probability distribution */}
            {sortedProbs.length > 0 && (
              <div className="card p-5">
                <p className="label-mono mb-4">Stage Probability Distribution</p>
                <div className="space-y-2">
                  {sortedProbs.map(([stage, prob]) => {
                    const isTop = stage === topStage;
                    const pct = (prob * 100).toFixed(2);
                    const barPct = Math.round(prob * 100);
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <span
                          className={`text-xs font-mono flex-shrink-0 ${isTop ? 'text-blue-400 font-bold' : 'text-slate-500'}`}
                          style={{ width: '80px' }}
                        >
                          {stage}
                        </span>
                        <div className="flex-1 progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${barPct}%`,
                              background: isTop
                                ? `linear-gradient(90deg, ${severityColor}60, ${severityColor})`
                                : '#334155',
                              boxShadow: isTop ? `0 0 6px ${severityColor}40` : 'none',
                            }}
                          />
                        </div>
                        <span
                          className={`text-xs font-mono w-14 text-right flex-shrink-0 ${isTop ? 'text-blue-400 font-bold' : 'text-slate-500'}`}
                        >
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Image thumbnail */}
            {imageUrl && (
              <div className="card p-4">
                <p className="label-mono mb-3">Analyzed Image</p>
                <div className="rounded-sm overflow-hidden border border-slate-700/40 bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Retinal scan"
                    className="w-full h-48 object-contain"
                    onError={(e) => {
                      if (imagePreview) {
                        (e.target as HTMLImageElement).src = imagePreview;
                      } else {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-600 font-mono mt-2 truncate">{result.image_filename}</p>
              </div>
            )}

            {imagePreview && !imageUrl && (
              <div className="card p-4">
                <p className="label-mono mb-3">Analyzed Image</p>
                <div className="rounded-sm overflow-hidden border border-slate-700/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Retinal scan" className="w-full h-48 object-contain bg-slate-900" />
                </div>
              </div>
            )}

            {/* Scan info */}
            <div className="card p-4 space-y-3">
              <p className="label-mono">Scan Details</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-mono">Scan ID</span>
                  <span className="text-slate-300 font-mono">#{result.id}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-mono">Patient</span>
                  <span className="text-slate-300 font-mono truncate max-w-[100px]">{result.patient_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-mono">Timestamp</span>
                  <span className="text-slate-300 font-mono">
                    {new Date(result.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button onClick={handleReset} className="btn-primary w-full justify-center">
                <Upload size={15} />
                New Scan
              </button>
              <button
                onClick={() => router.push('/dashboard/doctor/history')}
                className="btn-secondary w-full justify-center"
              >
                <ClipboardText size={15} />
                View History
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: Select ──────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ScanSmiley size={24} className="text-blue-400" />
        <div>
          <h1
            className="text-xl font-black tracking-widest uppercase text-slate-100"
            style={{ fontFamily: "'Chivo', sans-serif" }}
          >
            New AI Scan
          </h1>
          <p className="text-xs text-slate-500 font-mono tracking-wider">
            Upload retinal image for ROP classification
          </p>
        </div>
      </div>

      {analysisError && (
        <div className="flex items-center gap-2 bg-red-950/30 border border-red-800/40 rounded-sm px-4 py-3 text-sm text-red-400">
          <Warning size={16} className="flex-shrink-0" />
          {analysisError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Upload zone */}
        <div className="lg:col-span-3 space-y-4">
          {/* Drag-and-drop */}
          <div>
            <p className="label-mono mb-2">Retinal Image</p>
            <div
              className={`drop-zone p-8 text-center ${dragOver ? 'drag-over' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInput}
                onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
              />

              {imagePreview ? (
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-sm border border-slate-700/40 object-contain"
                  />
                  <p className="text-xs text-slate-400 font-mono">{imageFile?.name}</p>
                  <p className="text-xs text-blue-400">Click to change image</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-sm
                    bg-slate-800/60 border border-slate-700/40 mx-auto">
                    <ImageSquare size={28} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-300 font-medium mb-1">
                      Drop retinal image here
                    </p>
                    <p className="text-xs text-slate-500">
                      or click to browse — JPEG, PNG, BMP supported
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 text-xs text-blue-400">
                    <Upload size={12} />
                    Select Image
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — Form */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="label-mono block mb-1.5">Patient *</label>
            {patientsLoading ? (
              <div className="input-modern flex items-center gap-2 text-slate-500 text-xs py-3">
                <Spinner size={14} className="animate-spin" />
                Loading patients...
              </div>
            ) : patientsError ? (
              <div className="input-modern flex items-center gap-2 text-red-400 text-xs py-3">
                <Warning size={14} />
                Failed to load patients. Please refresh.
              </div>
            ) : patients.length === 0 ? (
              <div className="input-modern flex items-center gap-2 text-slate-500 text-xs py-3">
                <Warning size={14} />
                No patients found. Please add a patient first.
              </div>
            ) : (
              <select
                className="input-modern"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
              >
                <option value="">Select a patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.eye_side} eye
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="label-mono block mb-1.5">Notes (optional)</label>
            <textarea
              className="input-modern"
              placeholder="Clinical observations, patient condition..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Info box */}
          <div className="bg-blue-950/20 border border-blue-900/40 rounded-sm p-3">
            <p className="text-xs text-blue-400 font-mono mb-1">AI Model Info</p>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
              <li>11-class ROP stage classification</li>
              <li>Deep learning — ResNet/EfficientNet</li>
              <li>Confidence scores for all stages</li>
              <li>Results in seconds</li>
            </ul>
          </div>

          {formError && (
            <div className="flex items-center gap-2 bg-red-950/30 border border-red-800/40 rounded-sm px-3 py-2">
              <Warning size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{formError}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!imageFile || !patientId}
            className="btn-primary w-full justify-center"
          >
            <Eye size={16} weight="duotone" />
            Run AI Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
