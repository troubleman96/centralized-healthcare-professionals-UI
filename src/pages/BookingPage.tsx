/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, ArrowLeft, CheckCircle2, ChevronRight, FileText, AlertTriangle } from 'lucide-react';
import { api } from '../api.ts';
import { getCurrentUser } from '../auth.ts';
import { useToast } from '../toast.tsx';
import { Specialist, Branch } from '../types.ts';
import { getAvatarStyle, getInitials, formatDate } from '../utils.ts';

interface BookingPageProps {
  currentHash: string;
  onNavigate: (hash: string) => void;
}

export const BookingPage: React.FC<BookingPageProps> = ({ currentHash, onNavigate }) => {
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form values
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [posting, setPosting] = useState(false);

  const toast = useToast();
  const user = getCurrentUser();

  // Guard routing
  useEffect(() => {
    if (!user || user.role !== 'patient') {
      toast.warning("Access denied. Sign in as patient to book consultations.");
      onNavigate('#/login');
    }
  }, [user]);

  // Fetch Specialist profile
  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      // Syntax: #/book/101
      const sIdStr = currentHash.split('/')[2];
      if (!sIdStr) {
        toast.error("Invalid appointment path structure.");
        onNavigate('#/search');
        return;
      }
      const sId = parseInt(sIdStr);

      try {
        const [resSpec, resBranch] = await Promise.all([
          api.get(`/specialists/${sId}/`),
          api.get('/branches/')
        ]);

        if (resBranch.success) setBranches(resBranch.data);
        if (resSpec.success && resSpec.data) {
          setSpecialist(resSpec.data);
          
          // Pre-populate preferred default branch
          setSelectedBranchId(resSpec.data.branch_id.toString());
        } else {
          toast.error("Target specialist not found in records.");
          onNavigate('#/search');
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load appointment wizard resources.");
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [currentHash]);

  if (loading || !specialist) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 space-y-4 animate-pulse font-sans">
        <div className="shimmer-bg h-4 w-32 rounded mx-auto" />
        <div className="bg-[#0F172A] border border-gray-800 rounded-2xl h-96 w-full" />
      </div>
    );
  }

  // Pre-calculate date bounds of Section 8.4.1 (Min today, Max 30 days ahead)
  const todayStr = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Configured Time slot grid excluding 13:00 lunchtime
  const TIME_SLOTS = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
  ];

  const handleAdvanceToReview = () => {
    if (!selectedBranchId) {
      toast.warning("Please choose your attending campus branch.");
      return;
    }
    if (!selectedDate) {
      toast.warning("Please pick your booking date.");
      return;
    }
    if (!selectedTime) {
      toast.warning("Please select a physical consulting time slot.");
      return;
    }
    setStep(2);
  };

  const handlePostAppointment = async () => {
    setPosting(true);
    try {
      const res = await api.post('/appointments/', {
        specialist_id: specialist.id,
        branch_id: parseInt(selectedBranchId),
        date: selectedDate,
        time_slot: selectedTime,
        notes: notes
      });

      if (res.success) {
        setStep(3);
        toast.success(`Consultation requested with ${specialist.name}!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize consultation request.");
    } finally {
      setPosting(false);
    }
  };

  const selectedBranchName = branches.find(b => b.id === parseInt(selectedBranchId))?.name || "MNH Campus";

  // Check if specialist is available today at either branch to trigger warning (Section 8.4.1)
  const isAvailableToday = specialist.status === 'available' || specialist.status === 'other_branch';

  return (
    <div className="max-w-xl mx-auto px-4 py-8 font-sans animate-page-fade">
      
      {/* Centred Booking Card bounding Box (Section 8.4) */}
      <div className="bg-[#0F172A] border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* STEP PROGRESSIVE INDICATOR HEADER (Section 8.4) */}
        <div className="grid grid-cols-3 gap-2 border-b border-gray-800/80 pb-4 select-none">
          <div className="text-center">
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${step >= 1 ? 'text-[#10B981]' : 'text-gray-500'}`}>
              Step 1
            </span>
            <span className={`text-[11px] font-semibold ${step >= 1 ? 'text-gray-200 font-bold' : 'text-gray-400'}`}>
              Choose Slot
            </span>
          </div>
          <div className="text-center">
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${step >= 2 ? 'text-[#10B981]' : 'text-gray-500'}`}>
              Step 2
            </span>
            <span className={`text-[11px] font-semibold ${step >= 2 ? 'text-gray-200 font-bold' : 'text-gray-400'}`}>
              Review details
            </span>
          </div>
          <div className="text-center">
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${step >= 3 ? 'text-[#10B981]' : 'text-gray-500'}`}>
              Step 3
            </span>
            <span className={`text-[11px] font-semibold ${step >= 3 ? 'text-gray-200 font-bold' : 'text-gray-400'}`}>
              Confirmed
            </span>
          </div>
        </div>

        {/* STEP 1: CHOOSE DATE & TIME (Section 8.4.1) */}
        {step === 1 && (
          <div className="space-y-6 transition-all duration-300">
            
            {/* Read-Only Specialist profile banner */}
            <div className="flex gap-4 p-3 bg-gray-950/50 border border-gray-800 rounded-xl items-center">
              <div className="w-10 h-10 rounded text-xs flex items-center justify-center shrink-0" style={getAvatarStyle(specialist.name)}>
                <span>{getInitials(specialist.name)}</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-100">{specialist.name}</h3>
                <p className="text-[10px] text-[#10B981] font-semibold">{specialist.specialization}</p>
              </div>
            </div>

            {/* Availability warning if offline today */}
            {!isAvailableToday && (
              <div className="flex items-start gap-2.5 p-3 bg-[#1E150B] border-l-4 border-l-[#D97706] rounded-lg text-[11px] text-[#D97706] leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <span>
                  Dr. {specialist.name.split(' ').slice(-1)} is not available today at either branch. Proactive request remains open for future calendar schedules.
                </span>
              </div>
            )}

            {/* Campus Radio Selector */}
            <div className="form-group flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Attending Campus</label>
              <div className="grid grid-cols-2 gap-3 mt-1 text-xs">
                {branches.map(b => (
                  <label
                    key={b.id}
                    className={`p-3 border rounded-xl flex items-center gap-2.5 cursor-pointer hover:border-gray-700 transition-all ${
                      selectedBranchId === b.id.toString()
                        ? 'bg-[#10B981]/10 border-[#10B981] font-semibold text-white'
                        : 'bg-gray-950 border-gray-800 text-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="booking_branch"
                      value={b.id}
                      checked={selectedBranchId === b.id.toString()}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="accent-[#10B981] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="truncate block font-semibold text-gray-100 leading-none">{b.name.replace('MNH ', '')}</p>
                      <p className="text-[9px] text-gray-400 truncate mt-1">Terminal Desk</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Selection */}
            <div className="form-group flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Select Calendar Date</label>
              <div className="relative">
                <input
                  type="date"
                  min={todayStr}
                  max={maxDateStr}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#080D16] border border-gray-800 rounded-lg text-xs text-gray-100 placeholder-gray-700 focus:outline-none focus:border-[#10B981]"
                />
              </div>
            </div>

            {/* Time Slot PILLS Grid (Section 8.4.1.3 - STRICTLY NO SELECT DROPDOWN) */}
            <div className="form-group flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Consulting Hours (30m intervals)</label>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-1">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`py-1.5 rounded-lg text-xs font-semibold font-mono border text-center transition-all cursor-pointer ${
                      selectedTime === slot
                        ? 'bg-[#10B981] border-[#10B981] text-white font-bold'
                        : 'bg-[#080D16] border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes textarea (optional) */}
            <div className="form-group flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Clinical Notes or Symptoms</label>
              <textarea
                placeholder="Mention any follow-up reasons, symptoms, or current medication..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={400}
                className="w-full px-3.5 py-2.5 bg-[#080D16] border border-gray-800 rounded-lg text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-[#10B981] min-h-[80px]"
              />
            </div>

            {/* Navigation Button */}
            <button
              onClick={handleAdvanceToReview}
              className="w-full py-2.5 bg-[#10B981] hover:bg-emerald-600 font-sans text-xs font-bold text-white rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              Review Consultation Summary
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: SUMMARY VERIFICATION (Section 8.4.2) */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-up">
            <h2 className="text-sm font-display font-bold text-gray-200 uppercase tracking-wider pb-2 border-b border-gray-800">
              Verify Booking Parameters
            </h2>

            {/* Summary card details */}
            <div className="bg-[#080D16] border border-gray-800 rounded-xl p-4 space-y-4 font-sans text-xs">
              
              {/* Specialist */}
              <div className="flex gap-4 pb-3 border-b border-gray-800/60 items-center">
                <div className="w-10 h-10 rounded text-xs flex items-center justify-center shrink-0" style={getAvatarStyle(specialist.name)}>
                  <span>{getInitials(specialist.name)}</span>
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{specialist.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{specialist.specialization}</p>
                </div>
              </div>

              {/* Campus */}
              <div className="flex justify-between items-center text-gray-400 py-1">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#10B981]" /> Assigned Campus:
                </span>
                <span className="font-semibold text-white truncate">{selectedBranchName}</span>
              </div>

              {/* Date */}
              <div className="flex justify-between items-center text-gray-400 py-1">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#10B981]" /> Consulting Date:
                </span>
                <span className="font-semibold text-white">{formatDate(selectedDate)}</span>
              </div>

              {/* Time */}
              <div className="flex justify-between items-center text-gray-400 py-1">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#10B981]" /> Selected Time Slot:
                </span>
                <span className="font-semibold text-[#10B981] font-mono">{selectedTime} Hours</span>
              </div>

              {/* Notes */}
              {notes.trim() && (
                <div className="pt-3 border-t border-gray-800/60 text-gray-400 space-y-1">
                  <span className="flex items-center gap-2 font-bold text-gray-300">
                    <FileText className="w-4 h-4 text-[#10B981]" /> Patient clinical notes:
                  </span>
                  <p className="bg-gray-900/50 p-2 border border-gray-850 rounded italic text-gray-400 leading-relaxed max-h-24 overflow-y-auto">
                    "{notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Actions panel */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handlePostAppointment}
                className="w-full flex items-center justify-center py-2.5 bg-[#10B981] hover:bg-emerald-600 text-white font-sans text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-[0.98]"
                disabled={posting}
              >
                {posting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Transmitting consultation request...</span>
                  </div>
                ) : (
                  <span>Confirm and Request Booking</span>
                )}
              </button>

              <button
                onClick={() => setStep(1)}
                className="font-sans text-xs font-semibold text-gray-500 hover:text-white transition-all mx-auto flex items-center gap-1.5 cursor-pointer py-1"
                disabled={posting}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to calendar editing
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CONFIRMED PLAQUE (Section 8.4.3) */}
        {step === 3 && (
          <div className="py-8 flex flex-col items-center text-center space-y-6 animate-fade-up select-none">
            
            {/* success icon */}
            <div className="p-3 bg-[#10B981]/10 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-16 h-16 text-[#10B981] shrink-0" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-display font-bold text-gray-100">Appointment Requested!</h2>
              <p className="text-xs text-gray-400 max-w-sm mx-auto font-sans leading-relaxed">
                Your consultation request has been lodged on MNH central medical registers. Standard validation SMS/emails are dispatched. Check statuses on dashboard menus.
              </p>
            </div>

            <div className="bg-[#080D16] border border-gray-800 rounded-xl p-4 w-full text-xs font-sans space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Specialist:</span> <strong className="text-white font-bold">{specialist.name}</strong>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Campus Location:</span> <strong className="text-white font-bold">{selectedBranchName.replace('MNH ', '')}</strong>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Physician Hours:</span> <strong className="text-[#10B981] font-bold font-mono">{selectedTime} Hours (TZ)</strong>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Consultation Date:</span> <strong className="text-white font-bold">{formatDate(selectedDate)}</strong>
              </div>
            </div>

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={() => onNavigate('#/appointments')}
                className="w-full py-2.5 bg-gray-900 border border-gray-800 hover:border-gray-750 text-white font-sans text-xs font-semibold rounded-lg hover:text-[#10B981] cursor-pointer transition-colors"
              >
                View My Appointments
              </button>
              <button
                onClick={() => onNavigate('#/search')}
                className="font-sans text-xs font-semibold text-[#10B981] hover:underline"
              >
                Search Another Specialist
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
export default BookingPage;
