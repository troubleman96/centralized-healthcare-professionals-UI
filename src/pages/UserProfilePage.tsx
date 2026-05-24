/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User, Mail, Shield, ShieldAlert, Heart, Calendar } from 'lucide-react';
import { getCurrentUser } from '../auth.ts';

interface UserProfilePageProps {
  onNavigate: (hash: string) => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({ onNavigate }) => {
  const user = getCurrentUser();

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4 font-sans animate-fade-up">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold">Please Sign In</h2>
        <p className="text-gray-400 text-xs">Verify your session prior to managing your clinical dashboard profile.</p>
        <button
          onClick={() => onNavigate('#/login')}
          className="px-4 py-2 bg-[#10B981] hover:bg-emerald-600 text-white font-sans text-xs font-semibold rounded-lg transition-colors"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 font-sans animate-page-fade select-none">
      <div className="bg-[#0F172A] border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow node */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#10B981]/10 rounded-bl-full pointer-events-none" />

        <div className="flex flex-col items-center text-center space-y-4">
          
          {/* Avatar visual */}
          <div className="w-16 h-16 rounded-2xl bg-[#10B981]/15 text-[#10B981] font-display font-black text-xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
            {user.fullName.split(' ').map(n=>n[0]).slice(0, 2).join('')}
          </div>

          <div>
            <h1 className="text-lg font-display font-bold text-gray-100">{user.fullName}</h1>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{user.username}</p>
          </div>

          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10B981]/10 text-[#10B981] border border-emerald-500/20 uppercase tracking-wider">
            {user.role} Member
          </span>
        </div>

        <div className="mt-8 space-y-4 border-t border-gray-850 pt-6 text-xs text-gray-300">
          
          {/* Email segment */}
          <div className="flex items-center gap-3 p-3 bg-gray-950/40 rounded-xl border border-gray-900">
            <Mail className="w-4 h-4 text-gray-500 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Official Email Address</p>
              <p className="text-gray-200 mt-0.5 leading-none select-all">{user.email}</p>
            </div>
          </div>

          {/* Role descriptive items */}
          <div className="flex items-start gap-3 p-3 bg-gray-950/40 rounded-xl border border-gray-900">
            <Shield className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Authorized Access Rights</p>
              <p className="text-gray-400 mt-1 leading-normal">
                {user.role === 'patient' && "General patient record clearance: Book medical consultations and view scheduled chronology timelines."}
                {user.role === 'branch_admin' && "Branch clinical desk clearance: Full operational control over campus-level rotational schedules."}
                {user.role === 'super_admin' && "Super director general clearance: Absolute administrative controls over directories, roster listings and deactivations."}
              </p>
            </div>
          </div>
        </div>

        {/* Action button redirects */}
        <div className="mt-8 flex flex-col gap-2">
          {user.role === 'patient' ? (
            <button
              onClick={() => onNavigate('#/appointments')}
              className="w-full py-2 bg-[#10B981] hover:bg-emerald-600 text-white font-sans text-xs font-bold rounded-lg cursor-pointer transition-colors text-center"
            >
              My Scheduled Consultations
            </button>
          ) : (
            <button
              onClick={() => onNavigate('#/admin/availability')}
              className="w-full py-2 bg-[#10B981] hover:bg-emerald-600 text-white font-sans text-xs font-bold rounded-lg cursor-pointer transition-colors text-center"
            >
              Roster Availability Dashboard
            </button>
          )}

          <button
            onClick={() => onNavigate('#/')}
            className="text-center py-1.5 text-[11px] text-gray-500 hover:text-white transition-all font-semibold"
          >
            Return to Homepage
          </button>
        </div>

      </div>
    </div>
  );
};
export default UserProfilePage;
