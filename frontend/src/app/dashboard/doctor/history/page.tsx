'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ClipboardText,
  Eye,
  Trash,
  X,
  Warning,
  MagnifyingGlass,
  ImageSquare,
} from '@phosphor-icons/react';
import api, { type Prediction } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const SEVERITIES = ['All', 'normal', 'mild', 'moderate', 'severe', 'critical'];

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

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  prediction,
  onClose,
}: {
  prediction: Prediction;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Prediction>(prediction);
  const [loading, setLoading] = useState(false);
  const severityColor = getSeverityColor(detail.severity);

  useEffect(() => {
    setLoading(true);
    api.getPrediction(prediction.id)
      .then(setDetail)
      .catch(() => setDetail(prediction))
      .finally(() => setLoading(false));
  }, [prediction]);

  const imageUrl = detail.image_filename
    ? `${API_BASE}/static/uploads/${detail.image_filename}`
    : null;

  let probsObj: Record<string, number> = {};
  if (typeof detail.all_probabilities === 'string') {
    try {
      const parsed = JSON.parse(detail.all_probabilities);
      if (parsed.stage && Array.isArray(parsed.stage)) {
        const stageNames = ["Normal", "Stage 1-2", "Stage 3", "Stage 4-5"];
        parsed.stage.forEach((p: number, i: number) => {
          if (stageNames[i]) probsObj[stageNames[i]] = p;
        });
      }
    } catch (e) {}
  } else if (detail.all_probabilities) {
    probsObj = detail.all_probabilities as unknown as Record<string, number>;
  }
  const sortedProbs = Object.entries(probsObj).sort((a, b) => b[1] - a[1]);
  const topStage = sortedProbs[0]?.[0] ?? detail.rop_stage;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Eye size={20} className="text-blue-400" weight="duotone" />
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-200">Scan Details</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-3 text-slate-500">
            <span className="w-5 h-5 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
            <span className="text-sm font-mono">Loading details...</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/30 rounded-sm p-3 border border-slate-700/30">
                <p className="label-mono mb-1">Patient</p>
                <p className="text-sm font-semibold text-slate-200">{detail.patient_name}</p>
              </div>
              <div className="bg-slate-800/30 rounded-sm p-3 border border-slate-700/30">
                <p className="label-mono mb-1">Date</p>
                <p className="text-sm text-slate-300 font-mono">
                  {new Date(detail.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Main result */}
            <div
              className="rounded-sm p-4 border"
              style={{ borderColor: `${severityColor}30`, background: `${severityColor}08` }}
            >
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="label-mono mb-1">Stage</p>
                  <p className="text-xl font-black" style={{ fontFamily: "'Chivo', sans-serif", color: severityColor }}>
                    {formatStage(detail.stage, detail.rop_stage)}
                  </p>
                  {(detail.stage_prob !== undefined || detail.confidence) && (
                    <span className="text-xs font-mono text-slate-400">{((detail.stage_prob ?? detail.confidence) * 100).toFixed(1)}%</span>
                  )}
                </div>
                <div>
                  <p className="label-mono mb-1">Zone</p>
                  <p className="text-xl font-black" style={{ fontFamily: "'Chivo', sans-serif", color: severityColor }}>
                    {detail.zone !== undefined ? `Zone ${formatZone(detail.zone)}` : '—'}
                  </p>
                  {detail.zone_prob !== undefined && (
                    <span className="text-xs font-mono text-slate-400">{(detail.zone_prob * 100).toFixed(1)}%</span>
                  )}
                </div>
                <div>
                  <p className="label-mono mb-1">Plus Disease</p>
                  <p className="text-xl font-black" style={{ fontFamily: "'Chivo', sans-serif", color: severityColor }}>
                    {detail.plus_disease !== undefined ? (detail.plus_disease === 1 ? 'Plus' : 'No Plus') : '—'}
                  </p>
                  {detail.plus_prob !== undefined && (
                    <span className="text-xs font-mono text-slate-400">{(detail.plus_prob * 100).toFixed(1)}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Image */}
            {imageUrl && (
              <div>
                <p className="label-mono mb-2">Retinal Image</p>
                <div className="rounded-sm overflow-hidden border border-slate-700/40 bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Retinal scan"
                    className="w-full h-44 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                  />
                </div>
              </div>
            )}

            {/* Probability breakdown */}
            {sortedProbs.length > 0 && (
              <div>
                <p className="label-mono mb-3">All Stage Probabilities</p>
                <div className="space-y-1.5">
                  {sortedProbs.map(([stage, prob]) => {
                    const isTop = stage === topStage;
                    const pct = (prob * 100).toFixed(2);
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <span
                          className={`text-xs font-mono flex-shrink-0 ${isTop ? 'text-blue-400 font-bold' : 'text-slate-500'}`}
                          style={{ width: '70px' }}
                        >
                          {stage}
                        </span>
                        <div className="flex-1 progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${Math.round(prob * 100)}%`,
                              background: isTop
                                ? `linear-gradient(90deg, ${severityColor}60, ${severityColor})`
                                : '#334155',
                            }}
                          />
                        </div>
                        <span
                          className={`text-xs font-mono w-12 text-right flex-shrink-0 ${isTop ? 'text-blue-400 font-bold' : 'text-slate-500'}`}
                        >
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            {detail.notes && (
              <div className="bg-slate-800/20 border border-slate-700/30 rounded-sm p-3">
                <p className="label-mono mb-1">Clinical Notes</p>
                <p className="text-xs text-slate-400">{detail.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPredictions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getPredictions();
      setPredictions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPredictions(); }, [loadPredictions]);

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await api.deletePrediction(id);
      setPredictions((prev) => prev.filter((p) => p.id !== id));
      setDeleteId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete prediction');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = predictions.filter((p) => {
    const matchSeverity = filterSeverity === 'All' || p.severity?.toLowerCase() === filterSeverity.toLowerCase();
    const matchSearch = !search || p.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.rop_stage?.toLowerCase().includes(search.toLowerCase());
    return matchSeverity && matchSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ClipboardText size={24} className="text-blue-400" />
          <div>
            <h1
              className="text-xl font-black tracking-widest uppercase text-slate-100"
              style={{ fontFamily: "'Chivo', sans-serif" }}
            >
              Scan History
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-wider">
              {filtered.length} of {predictions.length} predictions
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search patient..."
              className="input-modern pl-8 py-2 w-44"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-modern py-2 w-36"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All Severities' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-950/30 border border-red-800/40 rounded-sm px-4 py-3 text-sm text-red-400">
          <Warning size={16} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
            <span className="w-5 h-5 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
            <span className="text-sm font-mono">Loading scan history...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600">
            <Eye size={44} className="mb-3 opacity-30" weight="duotone" />
            <p className="text-sm font-mono mb-1">No predictions found</p>
            <p className="text-xs text-slate-700 font-mono">
              {search || filterSeverity !== 'All' ? 'Try adjusting filters' : 'Run a scan from the New Scan page'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Patient</th>
                  <th>Prediction</th>
                  <th>Severity</th>
                  <th>Confidence</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pred) => {
                  const imageUrl = pred.image_filename
                    ? `${API_BASE}/static/uploads/${pred.image_filename}`
                    : null;

                  return (
                    <tr
                      key={pred.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedPrediction(pred)}
                    >
                      <td>
                        <div className="w-10 h-10 rounded-sm overflow-hidden bg-slate-800 border border-slate-700/40 flex items-center justify-center flex-shrink-0">
                          {imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={imageUrl}
                              alt="Scan"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#475569" viewBox="0 0 256 256"><path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Z"/></svg>';
                              }}
                            />
                          ) : (
                            <ImageSquare size={16} className="text-slate-500" />
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="font-medium text-slate-200">{pred.patient_name}</span>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-slate-300">
                          {pred.stage !== undefined 
                            ? `${formatStage(pred.stage, pred.rop_stage)}, Zone ${formatZone(pred.zone)}, ${pred.plus_disease === 1 ? 'Plus' : 'No Plus'}` 
                            : pred.rop_stage}
                        </span>
                      </td>
                      <td>
                        <span className={getSeverityClass(pred.severity)}>{pred.severity}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar w-16">
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${((pred.stage_prob ?? pred.confidence ?? 0) * 100).toFixed(0)}%`,
                                background: getSeverityColor(pred.severity),
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono text-slate-400">
                            {((pred.stage_prob ?? pred.confidence ?? 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-slate-500 text-xs font-mono">
                        {new Date(pred.created_at).toLocaleDateString()}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedPrediction(pred)}
                            className="p-1.5 rounded-sm text-slate-500 hover:text-blue-400 hover:bg-blue-950/30 transition-colors"
                            title="View details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteId(pred.id)}
                            className="p-1.5 rounded-sm text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                            title="Delete"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedPrediction && (
        <DetailModal
          prediction={selectedPrediction}
          onClose={() => setSelectedPrediction(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteId !== null && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-950/40 rounded-sm border border-red-800/40">
                <Warning size={20} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-200">Delete Scan</h2>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-5">
              Are you sure you want to permanently delete this prediction record?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="btn-danger flex-1 justify-center"
              >
                {deleting ? (
                  <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                ) : (
                  <><Trash size={14} /> Delete</>
                )}
              </button>
              <button onClick={() => setDeleteId(null)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
