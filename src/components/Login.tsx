import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import api from '../lib/axios';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const authStore = useAuthStore();

  // Redirect path after login
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.post('/login', { email, password });
      
      if (response.data?.success && response.data?.token && response.data?.user) {
        authStore.setAuth(response.data.token, response.data.user);
        navigate(from, { replace: true });
      } else {
        setError('Login returned an unexpected response format.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response?.data?.errors?.email) {
        setError(err.response.data.errors.email[0]);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Invalid credentials or server connection failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] dark:bg-[#0a0a0a] p-6 text-[#1A1A1A] dark:text-[#EDEDEC]" id="login-screen">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-md w-full bg-white dark:bg-[#161615] rounded-xl shadow-lg border border-gray-200 dark:border-[#3E3E3A] overflow-hidden"
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-100 dark:shadow-none italic mx-auto mb-4">
              P
            </div>
            <h1 className="text-3xl font-sans font-medium tracking-tight text-gray-900 dark:text-[#EDEDEC] mb-2">
              Laravel POS
            </h1>
            <p className="text-sm text-gray-600 dark:text-[#A1A09A]">
              Sign in to manage your Point of Sale system
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start gap-3 text-sm text-red-600 dark:text-red-400"
              id="login-error"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#EDEDEC] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cashier@gmail.com or admin@gmail.com"
                  className="block w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-[#1b1b18] border border-gray-200 dark:border-[#3E3E3A] rounded-lg text-gray-900 dark:text-[#EDEDEC] text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  required
                  id="email-input"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#EDEDEC] mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-11 py-2.5 bg-gray-50 dark:bg-[#1b1b18] border border-gray-200 dark:border-[#3E3E3A] rounded-lg text-gray-900 dark:text-[#EDEDEC] text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  required
                  id="password-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-[#EDEDEC]"
                  id="toggle-password-btn"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              id="submit-login-btn"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
        
        <div className="px-8 py-4 bg-gray-50 dark:bg-[#1b1b18] border-t border-gray-100 dark:border-[#3E3E3A] flex justify-between text-xs text-gray-500 dark:text-[#A1A09A]">
          <span>Cashier: cashier@gmail.com</span>
          <span>Admin: admin@gmail.com</span>
        </div>
      </motion.div>
    </div>
  );
};
