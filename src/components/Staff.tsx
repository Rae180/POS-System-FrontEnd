import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, X, Trash2, Shield, UserCircle } from 'lucide-react';
import api from '../lib/axios';

interface StaffUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  roles: { name: string }[];
}

export const Staff: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', role: 'cashier' });
  const [error, setError] = useState<string | null>(null);

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const response = await api.get('/users');
      return (response.data?.data || []) as StaffUser[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => api.post('/users', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setShowModal(false);
      setForm({ first_name: '', last_name: '', email: '', password: '', role: 'cashier' });
      setError(null);
    },
    onError: (err: any) => {
      const firstFieldError = Object.values(err.response?.data?.errors || {}).flat()[0] as string | undefined;
      setError(firstFieldError || err.response?.data?.message || 'Failed to create account.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  });

  return (
    <div className="p-8 max-w-4xl w-full mx-auto space-y-6" id="staff-panel">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-[#3E3E3A] pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDEC] flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Staff Accounts
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#A1A09A] mt-1">Create and manage cashier and admin logins</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition cursor-pointer"
          id="add-staff-btn"
        >
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#161615] rounded-xl border border-gray-200 dark:border-[#3E3E3A] overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-[#3E3E3A]">
          {staff.map((s) => {
            const isAdminRole = s.roles?.some((r) => r.name === 'admin');
            return (
              <div key={s.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-[#3E3E3A] text-indigo-600 dark:text-[#EDEDEC] flex items-center justify-center font-semibold text-xs">
                    {s.first_name?.[0]}{s.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-[#EDEDEC]">{s.first_name} {s.last_name}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isAdminRole ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'
                  }`}>
                    {isAdminRole ? <Shield className="w-3 h-3" /> : <UserCircle className="w-3 h-3" />}
                    {isAdminRole ? 'Admin' : 'Cashier'}
                  </span>
                  <button
                    onClick={() => { if (confirm(`Remove ${s.first_name}'s account?`)) deleteMutation.mutate(s.id); }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {staff.length === 0 && <div className="text-center py-10 text-sm text-gray-400">No staff accounts yet.</div>}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#161615] rounded-xl border border-gray-200 dark:border-[#3E3E3A] w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#3E3E3A]">
                <h3 className="font-bold text-gray-900 dark:text-[#EDEDEC]">New Staff Account</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="First name" value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="px-3 py-2.5 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] outline-none focus:ring-2 focus:ring-indigo-500" required />
                  <input type="text" placeholder="Last name" value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="px-3 py-2.5 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>

                <input type="email" placeholder="Email address" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] outline-none focus:ring-2 focus:ring-indigo-500" required />

                <input type="password" placeholder="Temporary password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] outline-none focus:ring-2 focus:ring-indigo-500" required minLength={8} />

                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>

                <button type="submit" disabled={createMutation.isPending}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition disabled:opacity-50 cursor-pointer">
                  {createMutation.isPending ? 'Creating...' : 'Create Account'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};