/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, AlertCircle } from 'lucide-react';
import { auth } from '../auth.ts';
import { useToast } from '../toast.tsx';

interface LoginPageProps {
  onNavigate: (hash: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const toast = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setLoading(true);

    if (!username.trim()) {
      setErrorText("Username or email address is required.");
      setLoading(false);
      return;
    }

    try {
      const res = await auth.login(username);
      if (res.success) {
        toast.success(`Welcome back, ${res.user.fullName}!`);
        
        // Redirect by role according to specification:
        // - patient -> #/
        // - branch_admin -> #/admin/availability
        // - super_admin -> #/admin/specialists (we can put this or board, let's follow spec exactly!)
        if (res.user.role === 'patient') {
          onNavigate('#/');
        } else if (res.user.role === 'branch_admin') {
          onNavigate('#/admin/availability');
        } else if (res.user.role === 'super_admin') {
          // spec says: super_admin -> #/admin/specialists
          onNavigate('#/admin/specialists');
        } else {
          onNavigate('#/');
        }
      }
    } catch (err: any) {
      setErrorText(err.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoUser: string) => {
    setUsername(demoUser);
    setPassword('••••••••');
    setErrorText(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-grid-pattern font-sans select-none animate-page-fade">
      <div className="max-w-md w-full bg-[#0F172A] border border-gray-800 rounded-2xl p-8 shadow-2xl">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-6 bg-[#10B981] rounded-sm" />
            <span className="font-display font-extrabold text-2xl tracking-tight text-white leading-none">MNH</span>
          </div>
          <h1 className="text-xl font-display font-bold text-gray-100">Welcome Back</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to access your real-time medical directory</p>
        </div>

        {/* Inline Error Banner */}
        {errorText && (
          <div className="error-banner flex items-start gap-2.5 p-3 bg-[#1C0D0D] border-l-4 border-l-[#DC2626] rounded-lg text-xs text-red-400 mb-6 font-medium animate-fade-up" role="alert">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="form-group flex flex-col gap-1.5">
            <label className="form-label text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">
              Username or Registered Email
            </label>
            <input
              type="text"
              placeholder="e.g., patient_user or admin_user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-4 py-2.5 bg-[#080D16] border border-gray-800 rounded-lg text-sm text-gray-100 font-sans placeholder-gray-600 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]/50 transition-all"
              disabled={loading}
              id="login_username"
            />
          </div>

          <div className="form-group flex flex-col gap-1.5 relative">
            <label className="form-label text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">
              Secure Guard Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-[#080D16] border border-gray-800 rounded-lg text-sm text-gray-100 font-sans placeholder-gray-600 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]/50 transition-all"
                disabled={loading}
                id="login_password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center py-2.5 px-4 bg-[#10B981] hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-55 disabled:pointer-events-none text-white font-sans text-sm font-semibold rounded-lg transition-all shadow-lg hover:shadow-emerald-500/10 cursor-pointer mt-6"
            disabled={loading}
            id="login_submit_btn"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying...</span>
              </div>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Demo Roles Quick Login Grid */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center mb-3">
            Developer / Sandbox quick access
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickLogin('patient_user')}
              className="p-2 border border-gray-800 hover:border-[#10B981]/30 bg-gray-900/40 rounded-lg hover:text-white transition-all text-left text-gray-400 font-sans"
              type="button"
            >
              <span className="font-semibold block text-emerald-400">Patient account</span>
              Lugenge Makungu
            </button>
            <button
              onClick={() => handleQuickLogin('super_admin')}
              className="p-2 border border-gray-800 hover:border-[#10B981]/30 bg-gray-900/40 rounded-lg hover:text-white transition-all text-left text-gray-400 font-sans"
              type="button"
            >
              <span className="font-semibold block text-[#10B981]">Super admin</span>
              Director General
            </button>
            <button
              onClick={() => handleQuickLogin('upanga_admin')}
              className="p-2 border border-gray-800 hover:border-[#10B981]/30 bg-gray-900/40 rounded-lg hover:text-white transition-all text-left text-gray-400 font-sans col-span-1"
              type="button"
            >
              <span className="font-semibold block text-blue-400">Upanga admin</span>
              Branch manager
            </button>
            <button
              onClick={() => handleQuickLogin('mloganzila_admin')}
              className="p-2 border border-gray-800 hover:border-[#10B981]/30 bg-gray-900/40 rounded-lg hover:text-white transition-all text-left text-gray-400 font-sans col-span-1"
              type="button"
            >
              <span className="font-semibold block text-indigo-400">Mloganzila admin</span>
              Branch manager
            </button>
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">
            Don't have an patient account?{' '}
            <button
              onClick={() => onNavigate('#/register')}
              className="text-[#10B981] hover:underline hover:text-emerald-400 transition-colors font-semibold"
            >
              Register now
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};
export default LoginPage;
