/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CalendarX, Clock, XCircle, MapPin, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../api.ts';
import { getCurrentUser } from '../auth.ts';
import { useToast } from '../toast.tsx';
import { Appointment } from '../types.ts';
import { getAvatarStyle, getInitials, formatDate, formatDateTime } from '../utils.ts';

interface AppointmentsPageProps {
  onNavigate: (hash: string) => void;
}

export const AppointmentsPage: React.FC<AppointmentsPageProps> = ({ onNavigate }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  
  const toast = useToast();
  const user = getCurrentUser();

  // Guard routing on mount
  useEffect(() => {
    if (!user || user.role !== 'patient') {
      toast.warning("Verification failed. Standard credentials required.");
      onNavigate('#/login');
    }
  }, [user]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments/');
      if (res.success) {
        setAppointments(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load appointment list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleCancelAppointment = async (apptId: number) => {
    try {
      const res = await api.patch(`/appointments/${apptId}/`, { status: "cancelled" });
      if (res.success) {
        toast.success("Appointment has been cancelled successfully.");
        setCancellingId(null);
        
        // Refresh appointment state locally
        setAppointments((prev) =>
          prev.map((app) => (app.id === apptId ? { ...app, status: 'cancelled' } : app))
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel appointment.");
    }
  };

  // Filter appointments by active Tab
  const getFilteredAppointments = (): Appointment[] => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    return appointments.filter((app) => {
      if (activeTab === 'cancelled') {
        return app.status === 'cancelled';
      }
      
      const isPast = app.date < todayStr;
      
      if (activeTab === 'past') {
        return isPast && app.status !== 'cancelled';
      }
      
      // upcoming tab
      return !isPast && app.status !== 'cancelled';
    });
  };

  const getStatusLabelColor = (status: string) => {
    if (status === 'confirmed') return 'bg-[#10B981]/10 text-emerald-400 border border-emerald-500/20';
    if (status === 'pending') return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
    return 'bg-gray-800 text-gray-400 border border-gray-700';
  };

  const filteredList = getFilteredAppointments();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans space-y-8 animate-page-fade">
      
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-display font-extrabold tracking-tight text-white">My Appointments</h1>
        <p className="text-xs text-gray-400 mt-1">Track history and live confirmation statuses for medical consultations</p>
      </div>

      {/* TIMELINE TAB SWITCH BAR (Section 8.5.1) */}
      <div className="flex gap-2.5 pb-2 border-b border-gray-850 select-none">
        {(['upcoming', 'past', 'cancelled'] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCancellingId(null);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg font-sans transition-all border outline-none cursor-pointer ${
                active
                  ? 'bg-emerald-500/10 text-emerald-400 border-[#10B981]'
                  : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:border-gray-850'
              }`}
            >
              <span className="capitalize">{tab} Appointments</span>
            </button>
          );
        })}
      </div>

      {/* APPOINTMENT ACTIONS CONTAINER RENDER */}
      {loading ? (
        <div className="space-y-4 py-12">
          {Array(2).fill(0).map((_, i) => (
            <div key={i} className="bg-[#0F172A] border border-gray-800 rounded-xl p-5 animate-pulse flex flex-col gap-3">
              <div className="flex gap-3 items-center">
                <div className="shimmer-bg w-10 h-10 rounded shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer-bg h-3 w-1/4 rounded animate-pulse" />
                  <div className="shimmer-bg h-2.5 w-1/3 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredList.length === 0 ? (
        /* Dynamic Empty States (Section 8.5.3) */
        <div className="py-20 flex flex-col items-center text-center max-w-sm mx-auto space-y-4 animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-500">
            {activeTab === 'upcoming' && <CalendarX className="w-7 h-7" />}
            {activeTab === 'past' && <Clock className="w-7 h-7" />}
            {activeTab === 'cancelled' && <XCircle className="w-7 h-7" />}
          </div>

          <div>
            <h3 className="font-display font-bold text-base text-gray-200">
              {activeTab === 'upcoming' ? "No upcoming appointments" : activeTab === 'past' ? "No past appointments yet" : "No cancelled appointments"}
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-sans">
              {activeTab === 'upcoming'
                ? "Find a specialist at Upanga or Mloganzila to schedule your real-time consultation."
                : activeTab === 'past'
                ? "Historical consultations you've finished will look compiled right here."
                : "Cancelled requested slots will be recorded in this slate."}
            </p>
          </div>

          {activeTab === 'upcoming' && (
            <button
              onClick={() => onNavigate('#/search')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#10B981] hover:bg-emerald-600 active:scale-95 text-xs text-white font-sans font-bold rounded-lg transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              Find a specialist
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        /* Appointment Item list cards (Section 8.5.2) */
        <div className="space-y-4">
          {filteredList.map((app) => (
            <div
              key={app.id}
              className="bg-[#0F172A] border border-gray-800 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all w-full animate-fade-up"
            >
              {/* Left Profile Detail */}
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded text-xs flex items-center justify-center shrink-0 border border-gray-805" style={getAvatarStyle(app.specialist_name)}>
                  <span>{getInitials(app.specialist_name)}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-sm text-gray-200">{app.specialist_name}</h3>
                  <p className="text-[10px] text-[#10B981] font-semibold">{app.specialist_specialization}</p>
                </div>
              </div>

              {/* Centre Details Location & Schedule */}
              <div className="space-y-1.5 font-sans text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span>Campus: <strong className="text-gray-200 font-bold">{app.branch_name.replace('MNH ', '')}</strong></span>
                </div>
                <p className="text-[10px] font-medium text-gray-300">
                  Scheduled for: <strong className="text-white font-semibold font-mono">{formatDate(app.date)} @ {app.time_slot} Hours</strong>
                </p>
                {app.notes && (
                  <p className="text-[10px] text-gray-500 truncate max-w-[280px] italic">
                    Note: "{app.notes}"
                  </p>
                )}
              </div>

              {/* Right: Actions, Badges & Confirmation Prompt (Section 8.5.2) */}
              <div className="shrink-0 flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${getStatusLabelColor(app.status)}`}>
                    {app.status}
                  </span>
                </div>

                {/* Cancel workflows */}
                {(app.status === 'pending' || app.status === 'confirmed') && (
                  <div className="w-full md:w-auto flex justify-end">
                    {cancellingId === app.id ? (
                      /* INLINE CONFIRMATION ROW (STRICTLY NO MODAL) (Section 8.5.2.4) */
                      <div className="bg-rose-950/20 p-2 border border-rose-500/20 rounded-lg flex items-center gap-3 animate-fade-up w-full justify-between">
                        <span className="text-[10px] text-rose-300 font-semibold font-sans">
                          Cancel slot?
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleCancelAppointment(app.id)}
                            className="px-2.5 py-1 bg-[#DC2626] text-white text-[10px] font-bold rounded-md hover:bg-red-750 transition-colors cursor-pointer"
                          >
                            Yes, cancel
                          </button>
                          <button
                            onClick={() => setCancellingId(null)}
                            className="px-2.5 py-1 bg-gray-900 border border-gray-800 text-gray-300 text-[10px] font-bold rounded-md hover:text-white transition-all cursor-pointer"
                          >
                            Keep it
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCancellingId(app.id)}
                        className="px-3 py-1.5 border border-transparent text-xs hover:border-rose-500/20 hover:bg-rose-500/10 text-rose-400 font-bold rounded-md transition-all cursor-pointer w-fit"
                      >
                        Cancel requested slot
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
export default AppointmentsPage;
