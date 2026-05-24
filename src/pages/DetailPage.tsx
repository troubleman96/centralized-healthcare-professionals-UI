/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Layers, MapPin, Phone, Mail, ArrowLeft, Info, HelpCircle, FileText, UserCheck, Clock } from 'lucide-react';
import { api } from '../api.ts';
import { getCurrentUser } from '../auth.ts';
import { useToast } from '../toast.tsx';
import { Specialist, Branch, Department, AvailabilityItem } from '../types.ts';
import { statusBadge, getAvatarStyle, getInitials, formatDate, formatDateTime, relativeTime, STATUS_CONFIG } from '../utils.ts';

interface DetailPageProps {
  currentHash: string;
  onNavigate: (hash: string) => void;
}

export const DetailPage: React.FC<DetailPageProps> = ({ currentHash, onNavigate }) => {
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tooltip tracking for 14-day availability strip
  const [activeHistoryIndex, setActiveHistoryIndex] = useState<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const user = getCurrentUser();

  // Extract ID from hash parameter
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      // Expected currentHash syntax: #/specialist/101
      const pathParts = currentHash.split('/');
      const idStr = pathParts[2]?.split('?')[0]; // strip query tags
      if (!idStr) {
        toast.error("Invalid specialist directory identifier.");
        onNavigate('#/search');
        return;
      }
      const sId = parseInt(idStr);

      try {
        const [resSpec, resBranch, resDept] = await Promise.all([
          api.get(`/specialists/${sId}/`),
          api.get('/branches/'),
          api.get('/departments/')
        ]);

        if (resBranch.success) setBranches(resBranch.data);
        if (resDept.success) setDepartments(resDept.data);
        if (resSpec.success && resSpec.data) {
          setSpecialist(resSpec.data);
        } else {
          toast.error("Specialist not found in rosters.");
          onNavigate('#/search');
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch specialist details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentHash]);

  // Handle clicking outside the active tooltip to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setActiveHistoryIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-8 animate-pulse font-sans">
        <div className="shimmer-bg h-6 w-24 rounded" />
        <div className="bg-[#0F172A] border border-gray-800 rounded-2xl p-6 space-y-6">
          <div className="flex gap-4 items-center">
            <div className="shimmer-bg w-20 h-20 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="shimmer-bg h-5 w-1/3 rounded" />
              <div className="shimmer-bg h-3.5 w-1/4 rounded" />
            </div>
          </div>
          <div className="shimmer-bg h-12 w-full rounded" />
        </div>
      </div>
    );
  }

  if (!specialist) return null;

  const specDept = departments.find(d => d.id === specialist.department_id);
  const specBranch = branches.find(b => b.id === specialist.branch_id);
  
  // Decide active campus label for today's rotation
  const activeCampusId = specialist.status === 'other_branch' ? (specialist.branch_id === 1 ? 2 : 1) : specialist.branch_id;
  const activeCampus = branches.find(b => b.id === activeCampusId);

  const getStatusCircleColor = (status: string) => {
    if (status === 'available') return 'bg-[#10B981]';
    if (status === 'unavailable') return 'bg-[#DC2626]';
    if (status === 'on_leave') return 'bg-[#9CA3AF]';
    if (status === 'in_theatre') return 'bg-[#D97706]';
    if (status === 'other_branch') return 'bg-[#2563EB]';
    return 'bg-gray-400';
  };

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-TZ", { weekday: 'short' });
  };

  const getDateNum = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getDate();
  };

  // Availability logs - Ensure safety to render exactly 14 items
  const historyList = specialist.availability || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans space-y-8 animate-page-fade">
      
      {/* Back to roster links */}
      <button
        onClick={() => onNavigate('#/search')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-[#10B981]" />
        Back to search results
      </button>

      {/* SECTION 1: PROFILE HEADER CONTAINER (Section 8.3.1) */}
      <div className="bg-[#0F172A] border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/5 rounded-bl-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {/* avatar-lg 80px block (Section 3.5.4) */}
            <div className="avatar w-20 h-20 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-gray-800 text-xl" style={getAvatarStyle(specialist.name)}>
              <span>{getInitials(specialist.name)}</span>
            </div>
            
            <div className="space-y-1.5 min-w-0">
              <h1 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-white leading-none">
                {specialist.name}
              </h1>
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-[#10B981]/10 text-emerald-400 border border-emerald-500/20 w-fit">
                {specialist.specialization}
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-400 font-sans pt-1">
                <p className="flex items-center gap-1.5 shrink-0">
                  <Layers className="w-4 h-4 text-gray-600 shrink-0" />
                  {specDept?.name}
                </p>
                <p className="flex items-center gap-1.5 shrink-0 font-semibold text-gray-300">
                  <MapPin className="w-4 h-4 text-[#10B981] shrink-0" />
                  Primary Terminal: {specBranch?.name.replace('MNH ', '')}
                </p>
              </div>
            </div>
          </div>

          {/* Today's status badge */}
          <div className="shrink-0 flex flex-col items-start sm:items-end gap-1 font-sans">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">TODAY'S STATUS</span>
            <div className="scale-110 origin-left sm:origin-right" dangerouslySetInnerHTML={{ __html: statusBadge(specialist.status) }} />
          </div>
        </div>

        {/* BLUE INFORMATION ROTATION ALERT CARD (Section 8.3.1.4) */}
        {specialist.status === 'other_branch' && (
          <div className="flex items-start gap-3 p-4 bg-[#0B1527] border-l-4 border-l-[#2563EB] rounded-xl text-xs text-blue-300 font-medium animate-fade-up">
            <Info className="w-4.5 h-4.5 text-[#2563EB] shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-bold text-gray-200">Rotation Campus Advisory</p>
              <p className="mt-0.5 text-gray-400">
                {specialist.name} is scheduled on rotation duties at <strong>{activeCampus?.name}</strong> today instead of their primary terminal. Appointment arrivals will be coordinated at that campus.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Booking CTA button */}
        <div className="pt-4 border-t border-gray-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-xs text-gray-500 font-sans">
            Updated by registry desk {specialist.last_status_update ? relativeTime(specialist.last_status_update) : "recently"}.
          </div>
          
          {/* Booking Guard selector */}
          {user ? (
            user.role === 'patient' ? (
              <button
                onClick={() => onNavigate(`#/book/${specialist.id}`)}
                className="px-5 py-2.5 bg-[#10B981] hover:bg-emerald-600 text-white font-sans text-xs font-bold rounded-lg cursor-pointer flex items-center gap-2 active:scale-95 transition-all shadow-md shadow-emerald-500/10"
              >
                <Calendar className="w-4 h-4" />
                Book Secure Appointment
              </button>
            ) : (
              <div className="text-xs text-indigo-400 font-mono font-semibold bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/15">
                Logged in as Directory Administrator
              </div>
            )
          ) : (
            <button
              onClick={() => onNavigate('#/login')}
              className="px-5 py-2.5 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white font-sans text-xs font-semibold rounded-lg cursor-pointer transition-all active:scale-95"
            >
              Sign back in to book slot
            </button>
          )}
        </div>

      </div>

      {/* SECTION 2: 14-DAY CHRONOLOGICAL REGISTERS (Section 8.3.2) */}
      <div className="bg-[#0F172A] border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-4 border-b border-gray-800">
          <div>
            <h2 className="font-display font-bold text-sm tracking-wide text-gray-200">
              Rotations Chronology — Last 14 Days
            </h2>
            <p className="text-xs text-gray-500 mt-1 font-sans">
              Click on any chronological timeline capsule to read specific notes and update histories.
            </p>
          </div>
          <span className="text-[10px] text-gray-400 font-mono bg-gray-950 px-2 py-1 rounded border border-gray-800 tracking-wider">
            INTERACTIVE MAP
          </span>
        </div>

        {/* Horizontal Timeline Strip */}
        <div className="relative">
          <div className="flex justify-between overflow-x-auto pb-4 gap-2 scrollbar-custom select-none">
            {historyList.length === 0 ? (
              <div className="w-full text-center py-6 text-xs text-gray-500 font-sans italic">
                No historical rotational records found for this specialist.
              </div>
            ) : (
              historyList.map((item, idx) => {
                const isToday = idx === historyList.length - 1;
                const active = activeHistoryIndex === idx;

                return (
                  <div
                    key={idx}
                    onClick={() => setActiveHistoryIndex(active ? null : idx)}
                    className={`flex-shrink-0 w-12 h-16 rounded-lg text-center flex flex-col justify-between p-2.5 cursor-pointer relative transition-all duration-150 ${
                      active ? 'bg-[#15233B]/80 border border-[#10B981]' : 'bg-[#080D16] border border-gray-900 hover:border-gray-800'
                    } ${isToday ? 'ring-2 ring-[#10B981]/50 border-[#10B981]' : ''}`}
                    title={`${getDayLabel(item.date)} ${getDateNum(item.date)}`}
                  >
                    {/* Day short text */}
                    <span className="text-[9px] text-gray-500 font-bold uppercase leading-none font-sans block">
                      {getDayLabel(item.date)}
                    </span>
                    
                    {/* Date Number */}
                    <span className="text-xs font-bold text-gray-200 leading-none font-display block">
                      {getDateNum(item.date)}
                    </span>

                    {/* Colored Status Dot */}
                    <div className="flex justify-center mt-1">
                      <span className={`w-2 h-2 rounded-full ${getStatusCircleColor(item.status)}`} />
                    </div>

                    {/* Today indicator text */}
                    {isToday && (
                      <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[7px] text-[#10B981] font-bold uppercase font-sans tracking-wide">
                        Today
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Absolute Floating Tooltip Card (Section 8.3.2.5) */}
          {activeHistoryIndex !== null && historyList[activeHistoryIndex] && (
            <div
              ref={tooltipRef}
              className="p-4 bg-[#0F172A] border border-gray-800 shadow-2xl rounded-xl w-full max-w-sm mt-3 animate-fade-up font-sans"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                <span className="text-xs font-bold text-gray-200">
                  Historical Log: {formatDate(historyList[activeHistoryIndex].date)}
                </span>
                <button
                  onClick={() => setActiveHistoryIndex(null)}
                  className="p-0.5 hover:bg-gray-800 rounded text-gray-500 hover:text-white"
                  aria-label="Close tooltip details"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3 pt-3 text-xs">
                {/* StatusBadge of selection */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Scheduled Status:</span>
                  <div className="scale-85 origin-right" dangerouslySetInnerHTML={{ __html: statusBadge(historyList[activeHistoryIndex].status) }} />
                </div>

                {/* Campus placement */}
                <div className="flex justify-between items-center text-gray-400">
                  <span>Campus terminal:</span>
                  <span className="text-gray-200 font-medium">
                    {branches.find(b => b.id === (historyList[activeHistoryIndex].status === 'other_branch' ? (specialist.branch_id === 1 ? 2 : 1) : specialist.branch_id))?.name.replace('MNH ', '') || "Upanga"}
                  </span>
                </div>

                {/* Update logs */}
                {historyList[activeHistoryIndex].notes && (
                  <div className="bg-gray-900/50 p-2 border border-gray-800/40 rounded text-gray-400">
                    <p className="font-bold text-gray-300">Administrative remarks:</p>
                    <p className="mt-0.5 leading-relaxed">{historyList[activeHistoryIndex].notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[10px] text-gray-600 mt-2 font-mono">
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Logged by {historyList[activeHistoryIndex].last_updated_by || "System Admin"}{' '}
                    {historyList[activeHistoryIndex].last_updated_at ? relativeTime(historyList[activeHistoryIndex].last_updated_at) : "previously"}.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: EXPANDED CLINICAL ABOUT (Section 8.3.3) */}
      <div className="bg-[#0F172A] border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4">
        <h2 className="font-display font-bold text-base text-gray-100 flex items-center gap-2 border-b border-gray-800 pb-3">
          <FileText className="w-4.5 h-4.5 text-[#10B981]" />
          Professional Bio & Expertise
        </h2>
        
        <p className="text-sm text-gray-400 leading-relaxed font-sans font-normal" id="specialist_bio">
          {specialist.bio || "No professional overview bio profile has been compiled yet in MNH's central database rosters. Contact information is verified below for consultations."}
        </p>

        {/* Verified contact panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-900 font-sans text-xs text-gray-400">
          <div className="flex items-center gap-2.5 p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
            <Mail className="w-4.5 h-4.5 text-gray-500 shrink-0" />
            <div>
              <p className="text-gray-500">Official Hospital Mail</p>
              <p className="text-gray-300 font-medium leading-relaxed mt-0.5 select-all">{specialist.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
            <Phone className="w-4.5 h-4.5 text-gray-500 shrink-0" />
            <div>
              <p className="text-gray-500">Secretary Contact Desk</p>
              <p className="text-gray-300 font-medium leading-relaxed mt-0.5 select-all">{specialist.phone || "No direct phone verified"}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

// Internal compact X icon for tooltips
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export default DetailPage;
