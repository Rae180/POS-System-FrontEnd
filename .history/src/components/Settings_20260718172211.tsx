import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Save, RefreshCw, Info, DollarSign, Percent, Store } from 'lucide-react';
import api from '../lib/axios';

interface Setting {
  id: number;
  key: string;
  value: string;
}

export const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingValues, setEditingValues] = useState<Record<number, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch settings from /api/settings
  const { data: settings = [], isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get('/settings');
      return response.data as Setting[] || [];
    },
  });

  const handleValueChange = (id: number, value: string) => {
    setEditingValues(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveSetting = async (settingId: number, originalKey: string) => {
    const newValue = editingValues[settingId];
    if (newValue === undefined) return;

    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    // Basic client validations
    if (originalKey === 'tax_rate') {
      const parsedRate = parseFloat(newValue);
      if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
        setErrorMessage('Tax rate must be a valid percentage between 0 and 100.');
        setIsSaving(false);
        return;
      }
    }

    // Construct bulk payload for PUT /settings as expected by SettingController::store()
    const payload: Record<string, string> = {};
    settings.forEach((s) => {
      payload[s.key] = editingValues[s.id] !== undefined ? editingValues[s.id] : s.value;
    });

    try {
      await api.put('/settings', payload);
      setSuccessMessage(`Setting "${originalKey}" successfully updated to "${newValue}"!`);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update system settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl w-full mx-auto space-y-6" id="settings-panel">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-[#3E3E3A] pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDEC] flex items-center gap-2">
            <SettingsIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            System Configuration Settings
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#A1A09A] mt-1">
            Configure default store names, currency symbol overrides, and sales tax ratios
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 border border-gray-200 dark:border-[#3E3E3A] hover:bg-gray-50 dark:hover:bg-[#1b1b18] rounded-lg text-gray-500 transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-400 font-semibold">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-semibold">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : settings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="settings-grid">
          {settings.filter((setting) => {
            const isTax = setting.key === 'tax_rate';
            const isCurrency = setting.key === 'currency_symbol';
            const isStore = setting.key === 'store_name';

            return (
              <motion.div
                layout
                key={setting.id}
                className="bg-white dark:bg-[#161615] rounded-xl border border-gray-200 dark:border-[#3E3E3A] p-6 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-3">
                    {isTax ? (
                      <Percent className="w-5 h-5" />
                    ) : isCurrency ? (
                      <DollarSign className="w-5 h-5" />
                    ) : (
                      <Store className="w-5 h-5" />
                    )}
                    <span className="text-xs font-black uppercase tracking-wider font-mono">
                      {setting.key.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 leading-relaxed">
                    {isTax
                      ? 'Controls the store-wide tax percentage added onto taxable item sub-totals on checkout.'
                      : isCurrency
                      ? 'Specifies the native symbol used across client screens and thermal receipts.'
                      : 'Changes the corporate retail logo name displayed on top headers and customer receipt logs.'}
                  </p>

                  <div className="relative">
                    <input
                      type="text"
                      value={editingValues[setting.id] ?? setting.value}
                      onChange={(e) => handleValueChange(setting.id, e.target.value)}
                      className="block w-full px-3.5 py-2.5 border border-gray-200 dark:border-[#3E3E3A] bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] rounded-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleSaveSetting(setting.id, setting.key)}
                    disabled={isSaving || editingValues[setting.id] === undefined}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition uppercase tracking-wider cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Setting</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-[#161615] rounded-xl border border-gray-200 dark:border-[#3E3E3A] text-gray-400">
          <SettingsIcon className="w-12 h-12 mx-auto mb-3 stroke-1" />
          <p className="text-sm font-semibold">No configured system settings found.</p>
        </div>
      )}

      {/* Info Notice card */}
      <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900/80 dark:text-gray-400 leading-relaxed">
          <p className="font-bold">Database Key-Value Freezing</p>
          <p className="mt-1">
            System values are loaded directly from the database schema. Once modified, changes take immediate effect for all active cashier lanes, ensuring global parameters match corporate policies.
          </p>
        </div>
      </div>
    </div>
  );
};
