/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, User, Mail, ShieldAlert, Phone } from 'lucide-react';
import { auth } from '../auth.ts';
import { useToast } from '../toast.tsx';

interface RegisterPageProps {
  onNavigate: (hash: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  
  const [strength, setStrength] = useState<'Weak' | 'Medium' | 'Strong'>('Weak');
  const [strengthLevel, setStrengthLevel] = useState<number>(0); // 0, 1, 2, 3
  const toast = useToast();

  // Password evaluation on changes
  useEffect(() => {
    if (!password) {
      setStrengthLevel(0);
      setStrength('Weak');
      return;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    const len = password.length;

    if (len >= 10 && hasUppercase && hasNumber && hasSymbol) {
      setStrengthLevel(3);
      setStrength('Strong');
    } else if (len >= 8 && (hasUppercase || hasNumber || hasSymbol)) {
      setStrengthLevel(2);
      setStrength('Medium');
    } else {
      setStrengthLevel(1);
      setStrength('Weak');
    }
  }, [password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    // Initial validations
    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      setErrorText("All required fields must be filled out completely.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorText("Passwords and confirmation entry do not match.");
      return;
    }

    if (password.length < 6) {
      setErrorText("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const user = await auth.register(fullName, username, email, phone);
      toast.success(`Account registered successfully! Welcome, ${user.fullName}.`);
      onNavigate('#/'); // Newly logged-in patients are sent to dashboard
    } catch (err: any) {
      setErrorText(err.message || "Registration failed. Please attempt again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 bg-grid-pattern font-sans select-none animate-page-fade">
      <div className="max-w-md w-full bg-[#0F172A] border border-gray-800 rounded-2xl p-8 shadow-2xl">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-6 bg-[#10B981] rounded-sm" />
            <span className="font-display font-extrabold text-xl tracking-tight text-white leading-none">MNH</span>
          </div>
          <h1 className="text-xl font-display font-bold text-gray-100">Patient Registration</h1>
          <p className="text-xs text-gray-400 mt-1">Join Muhimbili's real-time specialist mapping directory</p>
        </div>

        {/* Inline Error Banner */}
        {errorText && (
          <div className="error-banner flex items-start gap-2.5 p-3 bg-[#1C0D0D] border-l-4 border-l-[#DC2626] rounded-lg text-xs text-red-400 mb-5 font-semibold animate-fade-up" role="alert">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleRegister} className="space-y-3.5">
          
          {/* 1. Full Name */}
          <div className="form-group flex flex-col gap-1.5">
            <label className="form-label text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">
              Full Legal Name <span className="text-[#10B981]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Lugenge Makungu"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="px-3.5 py-2 bg-[#080D16] border border-gray-800 rounded-lg text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-[#10B981] transition-all font-sans"
              disabled={loading}
              required
            />
          </div>

          {/* 2. Username */}
          <div className="form-group flex flex-col gap-1.5">
            <label className="form-label text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">
              Unique Username <span className="text-[#10B981]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., itslugenge"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-3.5 py-2 bg-[#080D16] border border-gray-800 rounded-lg text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-[#10B981] transition-all font-sans"
              disabled={loading}
              required
            />
          </div>

          {/* 3. Email */}
          <div className="form-group flex flex-col gap-1.5">
            <label className="form-label text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">
              Active Email Address <span className="text-[#10B981]">*</span>
            </label>
            <input
              type="email"
              placeholder="e.g., patient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3.5 py-2 bg-[#080D16] border border-gray-800 rounded-lg text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-[#10B981] transition-all font-sans"
              disabled={loading}
              required
            />
          </div>

          {/* 4. Phone (Optional) */}
          <div className="form-group flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="form-label text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">
                Tanzania Mobile Number
              </label>
              <span className="text-[10px] text-gray-500 font-sans italic lowercase">(optional)</span>
            </div>
            <input
              type="tel"
              placeholder="e.g., +255 712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="px-3.5 py-2 bg-[#080D16] border border-gray-800 rounded-lg text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-[#10B981] transition-all font-sans"
              disabled={loading}
            />
          </div>

          {/* 5. Password */}
          <div className="form-group flex flex-col gap-1.5">
            <label className="form-label text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">
              Access Password <span className="text-[#10B981]">*</span>
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3.5 py-2 bg-[#080D16] border border-gray-800 rounded-lg text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-[#10B981] transition-all font-sans"
              disabled={loading}
              required
            />

            {/* Password strength meter */}
            {password && (
              <div className="mt-1 flex flex-col gap-1 animate-fade-up">
                <div className="grid grid-cols-3 gap-1.5 h-1">
                  <div className={`rounded-sm transition-all duration-300 ${strengthLevel >= 1 ? (strengthLevel === 1 ? 'bg-[#DC2626]' : strengthLevel === 2 ? 'bg-[#D97706]' : 'bg-[#10B981]') : 'bg-gray-800'}`} />
                  <div className={`rounded-sm transition-all duration-300 ${strengthLevel >= 2 ? (strengthLevel === 2 ? 'bg-[#D97706]' : 'bg-[#10B981]') : 'bg-gray-800'}`} />
                  <div className={`rounded-sm transition-all duration-300 ${strengthLevel >= 3 ? 'bg-[#10B981]' : 'bg-gray-800'}`} />
                </div>
                <p className="text-[10px] font-semibold flex items-center gap-1 mt-0.5">
                  <span className="text-gray-400">Security strength:</span>
                  <span className={
                    strength === 'Strong' ? 'text-[#10B981]' : strength === 'Medium' ? 'text-[#D97706]' : 'text-[#DC2626]'
                  }>
                    {strength}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* 6. Confirm Password */}
          <div className="form-group flex flex-col gap-1.5">
            <label className="form-label text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">
              Confirm Entry Password <span className="text-[#10B981]">*</span>
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="px-3.5 py-2 bg-[#080D16] border border-gray-800 rounded-lg text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-[#10B981] transition-all font-sans"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full h-10 flex items-center justify-center py-2 px-4 bg-[#10B981] hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-55 disabled:pointer-events-none text-white font-sans text-sm font-semibold rounded-lg transition-all shadow-lg hover:shadow-emerald-500/15 cursor-pointer mt-5"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Registering patient profile...</span>
              </div>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center mt-5 border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-400">
            Already registered with us?{' '}
            <button
              onClick={() => onNavigate('#/login')}
              className="text-[#10B981] hover:underline hover:text-emerald-400 transition-colors font-semibold"
            >
              Sign back in
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};
export default RegisterPage;
