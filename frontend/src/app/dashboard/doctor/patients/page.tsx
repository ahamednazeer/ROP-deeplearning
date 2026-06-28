'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Users, Plus, Trash, X, Warning, Eye } from '@phosphor-icons/react';
import api, { type Patient } from '@/lib/api';

function EyeSideBadge({ side }: { side: string }) {
  if (side === 'LEFT') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-mono font-semibold
        tracking-wider uppercase text-blue-300 bg-blue-950/50 border border-blue-800">
        Left
      </span>
    );
  }
  if (side === 'RIGHT') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-mono font-semibold
        tracking-wider uppercase text-green-300 bg-green-950/50 border border-green-800">
        Right
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-mono font-semibold
      tracking-wider uppercase text-purple-300 bg-purple-950/50 border border-purple-800">
      Both
    </span>
  );
}

interface PatientForm {
  name: string;
  age: string;
  birth_weight: string;
  gestational_age_weeks: string;
  sex: string;
  eye_side: string;
  notes: string;
}

const DEFAULT_FORM: PatientForm = {
  name: '',
  age: '',
  birth_weight: '',
  gestational_age_weeks: '',
  sex: '0',
  eye_side: 'LEFT',
  notes: '',
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<PatientForm>(DEFAULT_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getPatients();
      setPatients(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.gestational_age_weeks || !form.birth_weight) {
      setFormError('Name, age, gestational age, and birth weight are required.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const created = await api.createPatient({
        name: form.name,
        age: parseInt(form.age, 10),
        birth_weight: parseFloat(form.birth_weight),
        gestational_age_weeks: parseFloat(form.gestational_age_weeks),
        sex: parseInt(form.sex, 10),
        eye_side: form.eye_side,
        notes: form.notes || undefined,
      });
      setPatients((prev) => [created, ...prev]);
      setShowModal(false);
      setForm(DEFAULT_FORM);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create patient');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await api.deletePatient(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
      setDeleteId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete patient');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = search
    ? patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : patients;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-purple-400" />
          <div>
            <h1
              className="text-xl font-black tracking-widest uppercase text-slate-100"
              style={{ fontFamily: "'Chivo', sans-serif" }}
            >
              Patients
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-wider">{patients.length} registered patients</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search patients..."
            className="input-modern w-48 py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} />
            Add Patient
          </button>
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
            <span className="w-5 h-5 border-2 border-slate-600 border-t-purple-400 rounded-full animate-spin" />
            <span className="text-sm font-mono">Loading patients...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600">
            <Eye size={40} className="mb-3 opacity-40" />
            <p className="text-sm font-mono">{search ? 'No patients match search' : 'No patients registered yet'}</p>
            {!search && (
              <button onClick={() => setShowModal(true)} className="btn-primary mt-4 text-xs">
                <Plus size={14} /> Add First Patient
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Age (days)</th>
                  <th>Gestational Age</th>
                  <th>Birth Wt. (g)</th>
                  <th>Sex</th>
                  <th>Eye Side</th>
                  <th>Notes</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-950/60 border border-purple-800/40 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-purple-300">{p.name[0]?.toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-slate-200">{p.name}</span>
                      </div>
                    </td>
                    <td className="font-mono text-slate-300 text-xs">{p.age}d</td>
                    <td className="font-mono text-slate-300 text-xs">{p.gestational_age_weeks}w</td>
                    <td className="font-mono text-slate-300 text-xs">{p.birth_weight}g</td>
                    <td className="font-mono text-slate-300 text-xs">{p.sex === 0 ? 'M' : 'F'}</td>
                    <td><EyeSideBadge side={p.eye_side} /></td>
                    <td className="text-slate-500 text-xs max-w-xs truncate">{p.notes ?? '—'}</td>
                    <td className="text-slate-500 text-xs font-mono">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="btn-danger py-1 px-2 text-xs"
                      >
                        <Trash size={13} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-purple-400" />
                <h2 className="text-sm font-bold tracking-wider uppercase text-slate-200">Register Patient</h2>
              </div>
              <button
                onClick={() => { setShowModal(false); setFormError(''); setForm(DEFAULT_FORM); }}
                className="text-slate-500 hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label-mono block mb-1.5">Patient Name *</label>
                <input
                  type="text"
                  className="input-modern"
                  placeholder="Full name of the patient"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-mono block mb-1.5">Age (days) *</label>
                  <input
                    type="number"
                    className="input-modern"
                    placeholder="e.g. 45"
                    min={0}
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-mono block mb-1.5">Gestational Age (wk) *</label>
                  <input
                    type="number"
                    className="input-modern"
                    placeholder="e.g. 28"
                    min={20}
                    max={45}
                    step={0.1}
                    value={form.gestational_age_weeks}
                    onChange={(e) => setForm({ ...form, gestational_age_weeks: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-mono block mb-1.5">Birth Weight (g) *</label>
                  <input
                    type="number"
                    className="input-modern"
                    placeholder="e.g. 1500"
                    min={0}
                    step={1}
                    value={form.birth_weight}
                    onChange={(e) => setForm({ ...form, birth_weight: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-mono block mb-1.5">Sex *</label>
                  <select
                    className="input-modern"
                    value={form.sex}
                    onChange={(e) => setForm({ ...form, sex: e.target.value })}
                  >
                    <option value="0">Male</option>
                    <option value="1">Female</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-mono block mb-1.5">Eye Side *</label>
                <select
                  className="input-modern"
                  value={form.eye_side}
                  onChange={(e) => setForm({ ...form, eye_side: e.target.value })}
                >
                  <option value="LEFT">Left Eye</option>
                  <option value="RIGHT">Right Eye</option>
                  <option value="BOTH">Both Eyes</option>
                </select>
              </div>
              <div>
                <label className="label-mono block mb-1.5">Clinical Notes</label>
                <textarea
                  className="input-modern"
                  placeholder="Relevant medical history, observations..."
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 bg-red-950/30 border border-red-800/40 rounded-sm px-3 py-2">
                  <Warning size={14} className="text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400">{formError}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <><Plus size={15} /> Register Patient</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(''); setForm(DEFAULT_FORM); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
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
                <h2 className="text-sm font-bold text-slate-200">Delete Patient</h2>
                <p className="text-xs text-slate-500">This will remove all associated scans.</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-5">
              Are you sure you want to delete this patient record? All scan history will be permanently lost.
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
