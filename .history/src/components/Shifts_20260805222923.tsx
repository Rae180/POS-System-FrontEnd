import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Key, CheckCircle, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw, Clipboard } from 'lucide-react';
import api from '../lib/axios';
import { useAuthStore } from '../store/auth';

export const Shifts: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.some(r => r.name.toLowerCase() === 'admin') || false;
  const queryClient = useQueryClient();
  const [openingFloat, setOpeningFloat] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');

  const [closingCounted, setClosingCounted] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch current shift
  const { data: currentShift, isLoading: isLoadingCurrent, refetch: refetchCurrent } = useQuery({
    queryKey: ['current-shift'],
    queryFn: async () => {
      try {
        const response = await api.get('/shift/current');
        return response.data?.shift || null;
      } catch (err) {
        return null;
      }
    },
    retry: false,
  });

  // 2. Fetch past shifts
  const { data: shifts = [], isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const response = await api.get('/shifts');
      return response.data?.data || [];
    },
    enabled: isAdmin,
  });

  // Open Shift mutation
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const float = parseFloat(openingFloat);
    if (isNaN(float) || float < 0) {
      setError('Opening float must be a non-negative number.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/shift/open', {
        opening_float: float,
        notes: openingNotes || null,
      });
      setOpeningFloat('');
      setOpeningNotes('');
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to open shift.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close Shift mutation
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const counted = parseFloat(closingCounted);
    if (isNaN(counted) || counted < 0) {
      setError('Counted cash must be a non-negative number.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/shift/close', {
        closing_cash_counted: counted,
        notes: closingNotes || null,
      });
      setClosingCounted('');
      setClosingNotes('');
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to close shift.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isShiftOpen = !!currentShift;

  return (
    <div className="p-8 max-w-6xl w-full mx-auto space-y-8" id="shifts-panel">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-[#3E3E3A] pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDEC] flex items-center gap-2">
            <Clock className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Cash Drawer Shifts
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#A1A09A] mt-1">
            Open, manage, and close cashier till drawer sessions
          </p>
        </div>
        <button
          onClick={() => {
            refetchCurrent();
            refetchHistory();
          }}
          className="p-2 border border-gray-200 dark:border-[#3E3E3A] hover:bg-gray-50 dark:hover:bg-[#1b1b18] rounded-lg text-gray-500 transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoadingCurrent ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active till panel or till setup */}
          <div className="lg:col-span-2 space-y-6">
            {isShiftOpen ? (
              /* Active Open Till Details Panel */
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#161615] rounded-xl border border-emerald-200 dark:border-emerald-900/50 overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 px-6 py-4 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold">
                    <CheckCircle className="w-5 h-5" />
                    <span> Till Drawer Active</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-full font-bold">
                    SHIFT ID: {currentShift.id}
                  </span>
                </div>

                <div className="p-6 space-y-6">
                  {/* Detailed shift numbers */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-[#1b1b18] rounded-xl border border-gray-100 dark:border-transparent">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Opening Float
                      </div>
                      <div className="text-xl font-black text-gray-900 dark:text-[#EDEDEC]">
                        ${Number(currentShift.opening_float).toFixed(2)}
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-[#1b1b18] rounded-xl border border-gray-100 dark:border-transparent">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Expected Cash Logged
                      </div>
                      <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                        ${Number(currentShift.expected_cash_so_far).toFixed(2)}
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-[#1b1b18] rounded-xl border border-gray-100 dark:border-transparent">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Opened By
                      </div>
                      <div className="text-sm font-bold text-gray-800 dark:text-[#EDEDEC] truncate mt-1">
                        {currentShift.user?.first_name || 'System Cashier'}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-[#3E3E3A] pt-4 font-mono">
                    Session started at: {new Date(currentShift.opened_at).toLocaleString()}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Setup open till form */
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#161615] rounded-xl border border-gray-200 dark:border-[#3E3E3A] overflow-hidden shadow-sm"
              >
                <div className="bg-gray-50 dark:bg-[#1b1b18]/30 px-6 py-4 border-b border-gray-200 dark:border-[#3E3E3A] flex items-center gap-2 font-bold text-gray-900 dark:text-[#EDEDEC]">
                  <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Open Cashier Shift Drawer</span>
                </div>

                <form onSubmit={handleOpenShift} className="p-6 space-y-4">
                  {error && !isShiftOpen && (
                    <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-600 dark:text-red-400 font-medium">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Opening Till Float Cash ($)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 font-bold text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={openingFloat}
                        onChange={(e) => setOpeningFloat(e.target.value)}
                        className="block w-full pl-8 pr-3 py-2.5 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="100.00"
                        required
                        id="opening-float-input"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Specify the base cash amount loaded inside the till to provide change.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Session opening notes
                    </label>
                    <textarea
                      value={openingNotes}
                      onChange={(e) => setOpeningNotes(e.target.value)}
                      className="block w-full px-3.5 py-2 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none h-20 resize-none"
                      placeholder="e.g. Morning cashier terminal shift..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md shadow-indigo-100 dark:shadow-none transition disabled:opacity-50 cursor-pointer flex justify-center items-center"
                    id="open-shift-submit"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Open Active Till Shift Session'
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </div>

          {/* Right sidebar action form */}
          <div className="space-y-6">
            {isShiftOpen ? (
              /* Close Shift Drawer Action Form */
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-[#161615] rounded-xl border border-amber-200 dark:border-amber-900/50 overflow-hidden shadow-sm"
              >
                <div className="bg-amber-50/50 dark:bg-amber-950/20 px-6 py-4 border-b border-amber-100 dark:border-amber-900/30 flex items-center gap-2 font-bold text-amber-900 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
                  <span>Close Active Shift Drawer</span>
                </div>

                <form onSubmit={handleCloseShift} className="p-6 space-y-4">
                  {error && isShiftOpen && (
                    <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-600 dark:text-red-400 font-medium">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Physical Cash Counted Count ($)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 font-bold text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={closingCounted}
                        onChange={(e) => setClosingCounted(e.target.value)}
                        className="block w-full pl-8 pr-3 py-2.5 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="0.00"
                        required
                        id="closing-counted-input"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Count the physical cash in the till drawer including the float.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Session closing notes
                    </label>
                    <textarea
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      className="block w-full px-3.5 py-2 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none h-20 resize-none"
                      placeholder="e.g. Evening checkout reconciliations..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm shadow-md shadow-amber-100 dark:shadow-none transition disabled:opacity-50 cursor-pointer flex justify-center items-center"
                    id="close-shift-submit"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Close Active Shift Till Session'
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <div className="p-6 bg-indigo-50/50 dark:bg-[#161615] border border-dashed border-indigo-200 dark:border-[#3E3E3A] rounded-xl text-center space-y-3">
                <Clock className="w-10 h-10 mx-auto text-indigo-400" />
                <h4 className="text-sm font-bold text-indigo-900 dark:text-[#EDEDEC]">Till Locked</h4>
                <p className="text-xs text-indigo-700/70 dark:text-gray-400 max-w-[200px] mx-auto">
                  Open a till session on the left to process cashier sales or catalog edits.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Shifts Historical Logs */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-[#EDEDEC] flex items-center gap-2">
          <Clipboard className="w-5 h-5 text-gray-400" />
          Shift Reconciliation Logs
        </h3>

        {isLoadingHistory ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : shifts.length > 0 ? (
          <div className="bg-white dark:bg-[#161615] rounded-xl border border-gray-200 dark:border-[#3E3E3A] overflow-hidden shadow-sm">
            <table className="w-full border-collapse text-left text-xs text-gray-500">
              <thead className="bg-gray-50 dark:bg-[#1b1b18] text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-[#3E3E3A]">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Cashier</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Opened At</th>
                  <th className="px-6 py-4">Closed At</th>
                  <th className="px-6 py-4 text-right">Float</th>
                  <th className="px-6 py-4 text-right">Expected</th>
                  <th className="px-6 py-4 text-right">Counted</th>
                  <th className="px-6 py-4 text-right">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#3E3E3A] text-gray-700 dark:text-gray-300">
                {shifts.map((shift) => {
                  const diff = shift.variance ?? 0;
                  const isDifferenceOk = Math.abs(diff) < 0.01;

                  return (
                    <tr key={shift.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1b1b18]/40 transition">
                      <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-[#EDEDEC]">
                        {shift.id}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-[#EDEDEC]">
                        {shift.user?.first_name} {shift.user?.last_name}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                        const status = shift.closed_at ? 'closed' : 'open';
                        return(
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${shift.status === 'open'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800'
                          }`}>
                          {status}
                        </span>
                        );
                      })()}
                      </td>
                      <td className="px-6 py-4">{new Date(shift.opened_at).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {shift.closed_at ? new Date(shift.closed_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">${// after
                        Number(shift.opening_float).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        ${Number(shift.expected_cash_so_far).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {Number(shift.closing_cash_counted) ? `$${Number(shift.closing_cash_counted).toFixed(2)}` : 'N/A'}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-bold ${isDifferenceOk
                        ? 'text-emerald-600'
                        : diff > 0
                          ? 'text-indigo-600'
                          : 'text-red-500'
                        }`}>
                        {shift.closed_at ? (
                          <span className="flex items-center justify-end gap-1">
                            {diff > 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : diff < 0 ? (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            ) : null}
                            ${Number(diff).toFixed(2)}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] rounded-xl text-gray-400 text-sm">
            No historical shifts resolved yet.
          </div>
        )}
      </div>
    </div>
  );
};
