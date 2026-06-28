'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Users, Plus, Trash, X, Warning, UserCircle } from '@phosphor-icons/react';
import api, { type User } from '@/lib/api';

function RoleBadge({ role }: { role: string }) {
  if (role === 'ADMIN') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-mono font-semibold
        tracking-wider uppercase text-purple-300 bg-purple-950/50 border border-purple-800">
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-mono font-semibold
      tracking-wider uppercase text-blue-300 bg-blue-950/50 border border-blue-800">
      Doctor
    </span>
  );
}

interface NewUserForm {
  full_name: string;
  username: string;
  password: string;
  email: string;
  role: string;
}

const DEFAULT_FORM: NewUserForm = {
  full_name: '',
  username: '',
  password: '',
  email: '',
  role: 'DOCTOR',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewUserForm>(DEFAULT_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.username || !form.password || !form.email) {
      setFormError('All fields are required.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const created = await api.createUser(form);
      setUsers((prev) => [...prev, created]);
      setShowModal(false);
      setForm(DEFAULT_FORM);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await api.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setDeleteId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-purple-400" />
          <div>
            <h1
              className="text-xl font-black tracking-widest uppercase text-slate-100"
              style={{ fontFamily: "'Chivo', sans-serif" }}
            >
              User Management
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-wider">{users.length} registered accounts</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} />
          Add User
        </button>
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
            <span className="text-sm font-mono">Loading users...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600">
            <Users size={40} className="mb-3 opacity-40" />
            <p className="text-sm font-mono">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-slate-300">{u.full_name[0]?.toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-slate-200">{u.full_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-slate-300 text-xs">{u.username}</span>
                    </td>
                    <td className="text-slate-400 text-xs">{u.email}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td className="text-slate-500 text-xs font-mono">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <button
                        onClick={() => setDeleteId(u.id)}
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

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <UserCircle size={20} className="text-blue-400" />
                <h2 className="text-sm font-bold tracking-wider uppercase text-slate-200">Add New User</h2>
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
                <label className="label-mono block mb-1.5">Full Name</label>
                <input
                  type="text"
                  className="input-modern"
                  placeholder="Dr. John Smith"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div>
                <label className="label-mono block mb-1.5">Username</label>
                <input
                  type="text"
                  className="input-modern"
                  placeholder="jsmith"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
              <div>
                <label className="label-mono block mb-1.5">Email</label>
                <input
                  type="email"
                  className="input-modern"
                  placeholder="doctor@hospital.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label-mono block mb-1.5">Password</label>
                <input
                  type="password"
                  className="input-modern"
                  placeholder="Secure password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div>
                <label className="label-mono block mb-1.5">Role</label>
                <select
                  className="input-modern"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="DOCTOR">Doctor</option>
                  <option value="ADMIN">Admin</option>
                </select>
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
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      Create User
                    </>
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
                <h2 className="text-sm font-bold text-slate-200">Confirm Delete</h2>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-5">
              Are you sure you want to delete this user? All associated data may be affected.
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
                  <><Trash size={14} /> Delete User</>
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
