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
    <div className="min-h-screen flex items-center justify-center bg-[#111315] p-6" id="login-screen">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-md w-full bg-[#1B1E20] rounded-2xl border border-[#2E3234] overflow-hidden shadow-2xl"
      >
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[#2E3234]">
          <span className="led-pulse inline-flex h-2.5 w-2.5 rounded-full bg-[#E8A33D]"></span>
          <span className="font-['JetBrains_Mono'] text-[11px] tracking-[0.15em] text-[#8B8F91] uppercase">
            POS Terminal
          </span>
        </div>

        <div className="p-8">
          <div className="mb-7">
            <h1 className="text-2xl font-medium tracking-tight text-[#F2EFE6] mb-1.5">
              Sign in
            </h1>
            <p className="font-['JetBrains_Mono'] text-[12px] text-[#8B8F91]">
              <span aria-hidden="true">&gt;</span> awaiting credentials<span className="cursor-blink">_</span>
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-[#2A1917] border border-[#4A2B25] rounded-lg flex items-start gap-3 text-sm text-[#E9877A]"
              id="login-error"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#8B8F91] mb-1.5 uppercase tracking-wide">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5F6365]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cashier@gmail.com or admin@gmail.com"
                  className="block w-full pl-10 pr-4 py-2.5 bg-[#111315] border border-[#2E3234] rounded-lg text-[#F2EFE6] text-sm placeholder:text-[#5F6365] focus:ring-2 focus:ring-[#E8A33D]/60 focus:border-[#E8A33D]/60 outline-none transition"
                  required
                  id="email-input"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8B8F91] mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5F6365]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-11 py-2.5 bg-[#111315] border border-[#2E3234] rounded-lg text-[#F2EFE6] text-sm placeholder:text-[#5F6365] focus:ring-2 focus:ring-[#E8A33D]/60 focus:border-[#E8A33D]/60 outline-none transition"
                  required
                  id="password-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#5F6365] hover:text-[#8B8F91]"
                  id="toggle-password-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center px-5 py-3 bg-[#E8A33D] hover:bg-[#D6952F] text-[#171008] text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              id="submit-login-btn"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-[#171008] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <div className="border-t border-dashed border-[#2E3234] px-8 py-4 flex justify-between font-['JetBrains_Mono'] text-[10px] text-[#5F6365] uppercase tracking-wide">
          <span>cashier: cashier@gmail.com</span>
          <span>admin: admin@gmail.com</span>
        </div>
      </motion.div>
    </div>
  );
};