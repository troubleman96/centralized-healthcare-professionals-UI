/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ClipboardCheck, Users, Scissors, CalendarClock, RefreshCw, Save, Sparkles, Check, CheckCircle, Search, LogOut, Loader2, X } from 'lucide-react';
import { api } from '../api.ts';
import { getCurrentUser } from '../auth.ts';
import { useToast } from '../toast.tsx';
import { Specialist, Branch, Department, SpecialistStatus } from '../types.ts';
import { getAvatarStyle, getInitials, formatDate, STATUS_CONFIG } from '../utils.ts';

interface AdminAvailabilityProps {
  currentHash: string;
  onNavigate: (hash: string) => void;
  // Let the parent know if there are unsaved changes to protect routers
  setHasUnsavedChanges: (val: boolean) => void;
}

export const AdminAvailability: React.FC<AdminAvailabilityProps> = ({ currentHash, onNavigate, setHasUnsavedChanges }) => {
  const user = getCurrentUser();
  const toast = useToast();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('1');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Table status edit buffers
  // Maps specialistId -> current modified status string
  const [modifiedStatuses, setModifiedStatuses] = useState<Record<number, SpecialistStatus>>({});
  // Track notes/remarks per specialist
  const [modifiedNotes, setModifiedNotes] = useState<Record<number, string>>({});
  // Track saving row loaders
  const [savingRows, setSavingRows] = useState<Record<number, boolean>>({});
  // Successful flash trigger animation row maps
  const [flashingRows, setFlashingRows] = useState<Record<number, boolean>>({});

  // Stats Counters
  const [statAvailable, setStatAvailable] = useState(0);
  const [statTheatre, setStatTheatre] = useState(0);
  const [statLeave, setStatLeave] = useState(0);
  const [statUnavailable, setStatUnavailable] = useState(0);

  // Bulk Modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<SpecialistStatus>('available');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkPosting, setBulkPosting] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ name: string; success: boolean }[] | null>(null);

  const [lastFetched, setLastFetched] = useState<Date>(new Date());

  // Check role guard on mount (Section 8.8)
  useEffect(() => {
    if (!user || (user.role !== 'branch_admin' && user.role !== 'super_admin')) {
      toast.error("Unauthorized access.");
      onNavigate('#/');
    } else {
      // Pre-select branch if branch admin
      if (user.role === 'branch_admin' && user.branch_id) {
        setSelectedBranchId(user.branch_id.toString());
      }
    }
  }, [user]);

  // Read Resources
  const fetchResources = async () => {
    setLoading(true);
    try {
      const [resB, resD, resS] = await Promise.all([
        api.get('/branches/'),
        api.get('/departments/'),
        api.get('/specialists/?all=true')
      ]);

      if (resB.success) setBranches(resB.data);
      if (resD.success) setDepartments(resD.data);
      if (resS.success) {
        setSpecialists(resS.data);
        // Wipe pending changes on fresh reload
        setModifiedStatuses({});
        setModifiedNotes({});
        setHasUnsavedChanges(false);
      }
      setLastUpdatedTimestamps();
    } catch (err) {
      console.error(err);
      toast.error("Failed to sync clinical timetables.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const setLastUpdatedTimestamps = () => {
    setLastFetched(new Date());
  };

  // Recalculate interactive counts for Stats Header Card in-place (Section 8.8.2)
  const calculateStats = () => {
    // We calculate counts based on the current selections (branch_id)
    const bId = parseInt(selectedBranchId);
    const activeSpecs = specialists.filter(s => s.branch_id === bId && s.is_active);

    let avail = 0;
    let theatre = 0;
    let leave = 0;
    let unavail = 0;

    activeSpecs.forEach(s => {
      // Use pending status if modified, else original status
      const currentStatus = modifiedStatuses[s.id] || s.status;
      if (currentStatus === 'available') avail++;
      else if (currentStatus === 'in_theatre') theatre++;
      else if (currentStatus === 'on_leave') leave++;
      else if (currentStatus === 'unavailable' || currentStatus === 'other_branch') unavail++;
    });

    setStatAvailable(avail);
    setStatTheatre(theatre);
    setStatLeave(leave);
    setStatUnavailable(unavail);
  };

  useEffect(() => {
    calculateStats();
  }, [specialists, modifiedStatuses, selectedBranchId]);

  // Track if any modifications differ from the original DB values
  const hasPendingChanges = Object.keys(modifiedStatuses).length > 0;
  
  useEffect(() => {
    setHasUnsavedChanges(hasPendingChanges);
  }, [hasPendingChanges]);

  // Row-level Select dynamic color properties (Section 8.8.3)
  const getRowSelectBgColor = (status: SpecialistStatus) => {
    const config = STATUS_CONFIG[status];
    if (status === 'available') return '#0B1510'; // Dark green
    if (status === 'in_theatre') return '#1E140B'; // Dark amber
    if (status === 'on_leave') return '#1A1C1F'; // Dark grey
    if (status === 'unavailable') return '#1C0D0D'; // Dark red
    if (status === 'other_branch') return '#0C121F'; // Dark blue
    return '#080D16';
  };

  const getRowSelectTextColor = (status: SpecialistStatus) => {
    if (status === 'available') return '#10B981';
    if (status === 'in_theatre') return '#D97706';
    if (status === 'on_leave') return '#9CA3AF';
    if (status === 'unavailable') return '#DC2626';
    if (status === 'other_branch') return '#3B82F6';
    return '#E2E8F0';
  };

  const handleStatusChange = (specId: number, newStatus: SpecialistStatus) => {
    const original = specialists.find(s => s.id === specId);
    if (!original) return;

    if (original.status === newStatus) {
      // Pluck out of mods if reverted to original value
      setModifiedStatuses(prev => {
        const copy = { ...prev };
        delete copy[specId];
        return copy;
      });
    } else {
      setModifiedStatuses(prev => ({ ...prev, [specId]: newStatus }));
    }
  };

  const handleNotesChange = (specId: number, val: string) => {
    setModifiedNotes(prev => ({ ...prev, [specId]: val }));
  };

  // Row Level Save (Section 8.8.4)
  const handleSaveRow = async (specId: number) => {
    const newStatus = modifiedStatuses[specId];
    if (!newStatus) return;

    setSavingRows(prev => ({ ...prev, [specId]: true }));
    try {
      const notesVal = modifiedNotes[specId] || "";
      const res = await api.patch(`/availability/${specId}/`, {
        status: newStatus,
        notes: notesVal,
        updated_by: user?.fullName || "Registry Admin"
      });

      if (res.success) {
        // Update local specialist entity in-place
        setSpecialists(prev =>
          prev.map(s => {
            if (s.id === specId) {
              const updated = {
                ...s,
                status: newStatus,
                last_status_update: new Date().toISOString(),
                last_updated_by: user?.fullName || "Registry Admin"
              };
              // Update today's log notes under availability
              if (updated.availability.length > 0) {
                const todayItem = updated.availability[updated.availability.length - 1];
                todayItem.status = newStatus;
                todayItem.notes = notesVal;
                todayItem.last_updated_by = updated.last_updated_by;
                todayItem.last_updated_at = updated.last_status_update;
              }
              return updated;
            }
            return s;
          })
        );

        // Wipe row buffers
        setModifiedStatuses(prev => {
          const c = { ...prev };
          delete c[specId];
          return c;
        });
        setModifiedNotes(prev => {
          const c = { ...prev };
          delete c[specId];
          return c;
        });

        toast.success("Roster status synchronized successfully.");
        
        // Trigger row splash flash animation
        setFlashingRows(prev => ({ ...prev, [specId]: true }));
        setTimeout(() => {
          setFlashingRows(prev => ({ ...prev, [specId]: false }));
        }, 1200);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update availability.");
    } finally {
      setSavingRows(prev => ({ ...prev, [specId]: false }));
    }
  };

  // Bulk update (Section 8.8.6)
  const handleBulkUpdate = async () => {
    setBulkPosting(true);
    setBulkResults(null);
    try {
      const res = await api.post('/availability/bulk/', {
        status: bulkStatus,
        remarks: bulkNotes,
        branch_id: parseInt(selectedBranchId)
      });

      if (res.success) {
        setBulkResults(res.updated || []);
        toast.success(`Successfully batch modified terminal!`);
        
        // Refresh local listings
        const resS = await api.get('/specialists/?all=true');
        if (resS.success) {
          setSpecialists(resS.data);
          setModifiedStatuses({});
          setModifiedNotes({});
          setHasUnsavedChanges(false);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Bulk updating failed.");
    } finally {
      setBulkPosting(false);
    }
  };

  const handleCloseBulkModal = () => {
    setShowBulkModal(false);
    setBulkResults(null);
    setBulkNotes('');
  };

  // Filter lists of table
  const bId = parseInt(selectedBranchId);
  const tableSpecialists = specialists.filter(s => {
    const isBranch = s.branch_id === bId;
    const isSearch = !searchTerm.trim() || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    return isBranch && isSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8 animate-page-fade">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold tracking-tight text-white flex items-center gap-2">
            Clinical Availability Board
          </h1>
          <p className="text-xs text-gray-450 mt-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            Terminal management for authorized medical desk counters
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          <div className="flex flex-col gap-1 w-full sm:w-auto text-xs">
            <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono">Managed campus</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={user?.role === 'branch_admin'} // Lock branch admins
              className="px-3 py-1.5 bg-[#0F172A] border border-gray-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-40"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-auto text-xs">
            <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono">Rotation date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-[#0F172A] border border-gray-800 rounded-lg text-xs text-slate-200 outline-none"
            />
          </div>

          <button
            onClick={() => setShowBulkModal(true)}
            className="px-3.5 py-1.5 bg-[#10B981] hover:bg-emerald-600 text-white font-sans text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95 shrink-0 self-end h-8 border border-[#10B981] shadow-lg shadow-emerald-500/10 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Bulk Update
          </button>
        </div>
      </div>

      {/* STATS COUNT BAR (Section 8.8.2) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
        
        {/* Available Card */}
        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4 flex gap-3.5 items-center">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-450 shrink-0">
            <ClipboardCheck className="w-5 h-5 col-span-1" />
          </div>
          <div>
            <span className="text-2xl font-display font-black text-emerald-400 block leading-none antialiased">
              {statAvailable}
            </span>
            <span className="text-[9px] text-gray-450 font-bold uppercase tracking-wider font-sans mt-1 block">Available Patients</span>
          </div>
        </div>

        {/* In Theatre Card */}
        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4 flex gap-3.5 items-center">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-display font-black text-amber-500 block leading-none antialiased">
              {statTheatre}
            </span>
            <span className="text-[9px] text-gray-450 font-bold uppercase tracking-wider font-sans mt-1 block">In Theatre</span>
          </div>
        </div>

        {/* On Leave Card */}
        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4 flex gap-3.5 items-center">
          <div className="p-2.5 rounded-lg bg-gray-500/10 text-gray-400 shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-display font-black text-gray-400 block leading-none antialiased">
              {statLeave}
            </span>
            <span className="text-[9px] text-gray-450 font-bold uppercase tracking-wider font-sans mt-1 block">On Leave</span>
          </div>
        </div>

        {/* Unavailable card */}
        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4 flex gap-3.5 items-center">
          <div className="p-2.5 rounded-lg bg-rose-550/10 text-rose-500 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-display font-black text-rose-500 block leading-none antialiased">
              {statUnavailable}
            </span>
            <span className="text-[9px] text-gray-450 font-bold uppercase tracking-wider font-sans mt-1 block">Unavail/rotation</span>
          </div>
        </div>

      </div>

      {/* FILTER SEARCH INPUT FOR LISTINGS */}
      <div className="bg-gray-950 p-4 rounded-xl border border-gray-850 flex items-center pl-3">
        <Search className="w-4 h-4 text-gray-600 shrink-0" />
        <input
          type="text"
          placeholder="Filter table listing by specialist name keyword or expertise..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent pl-2 outline-none text-xs text-gray-200 placeholder-gray-600 font-sans"
        />
      </div>

      {/* MAIN TABLE CONTAINER (Section 8.8.3) */}
      <div className="bg-[#0F172A] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-[#080D16]/50 text-gray-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Specialist Roster</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Scheduled Status</th>
                <th className="py-3 px-4">Core remarks / notes</th>
                <th className="py-3 px-4">Last Sync</th>
                <th className="py-3 px-4 text-right">Action Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850">
              {tableSpecialists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 font-sans italic">
                    No specialists found matching filters.
                  </td>
                </tr>
              ) : (
                tableSpecialists.map((spec) => {
                  const specDept = departments.find(d => d.id === spec.department_id);
                  const isModified = modifiedStatuses[spec.id] !== undefined;
                  const currentStatus = modifiedStatuses[spec.id] || spec.status;
                  const saving = savingRows[spec.id] || false;
                  const flashing = flashingRows[spec.id] || false;

                  // Define Left dynamic border values
                  let borderLeftColor = 'transparent';
                  if (currentStatus === 'available') borderLeftColor = '#0F9B58';
                  else if (currentStatus === 'unavailable') borderLeftColor = '#DC2626';
                  else if (currentStatus === 'on_leave') borderLeftColor = '#9CA3AF';
                  else if (currentStatus === 'in_theatre') borderLeftColor = '#D97706';
                  else if (currentStatus === 'other_branch') borderLeftColor = '#2563EB';

                  return (
                    <tr
                      key={spec.id}
                      className={`hover:bg-[#121A2C]/25 transition-all text-gray-300 relative ${flashing ? 'animate-saved-flash' : ''}`}
                      style={{
                        borderLeft: `4px solid ${borderLeftColor}`,
                        // update custom CSS properties in row context
                        ['--row-status-bg' as any]: getRowSelectBgColor(currentStatus)
                      }}
                    >
                      {/* 1. Specialist */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex gap-3 items-center">
                          {/* Unsaved indicator 3px amber dot (Section 8.8.3.4) */}
                          {isModified ? (
                            <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse absolute left-1 flex" title="Unsaved changes pending on this row" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute left-1 flex" title="Roster fully synchronized" />
                          )}
                          <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-[10px] font-bold leading-none border border-gray-850" style={getAvatarStyle(spec.name)}>
                            <span>{getInitials(spec.name)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-200 truncate">{spec.name}</p>
                            <p className="text-[10px] text-gray-500 font-semibold truncate uppercase tracking-tight">{spec.specialization}</p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Department */}
                      <td className="py-3.5 px-4 text-gray-400 capitalize">
                        {specDept?.name ? specDept.name.replace(' & ', ' / ') : "Physiology"}
                      </td>

                      {/* 3. Status Select column (Section 8.8.3.3) */}
                      <td className="py-3.5 px-4">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(spec.id, e.target.value as SpecialistStatus)}
                          className="px-2 py-1.5 rounded border border-gray-800 hover:border-gray-700 text-[11px] font-bold focus:outline-none transition-all cursor-pointer w-36 font-sans"
                          style={{
                            background: `var(--row-status-bg, #0B0F19)`,
                            color: getRowSelectTextColor(currentStatus)
                          }}
                        >
                          <option value="available" className="bg-[#080D16] text-[#10B981]">🟢 Available</option>
                          <option value="in_theatre" className="bg-[#080D16] text-[#D97706]">🟠 In Theatre</option>
                          <option value="on_leave" className="bg-[#080D16] text-[#9CA3AF]">⚪ On Leave</option>
                          <option value="unavailable" className="bg-[#080D16] text-[#DC2626]">🔴 Unavailable</option>
                          <option value="other_branch" className="bg-[#080D16] text-[#3B82F6]">🔵 At Other Branch</option>
                        </select>
                      </td>

                      {/* 4. Core remarks */}
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          placeholder="e.g. Surgery or Ward assisting..."
                          value={modifiedNotes[spec.id] !== undefined ? modifiedNotes[spec.id] : (spec.availability[spec.availability.length - 1]?.notes || '')}
                          onChange={(e) => handleNotesChange(spec.id, e.target.value)}
                          className="px-2.5 py-1.5 bg-[#080D16]/40 hover:bg-[#080D16] border border-gray-800 rounded placeholder-gray-700 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 w-full font-sans transition-colors"
                        />
                      </td>

                      {/* 5. Last sync editor */}
                      <td className="py-3.5 px-4 text-[10px] text-gray-500 font-sans leading-normal">
                        <p className="text-gray-400 font-bold">{spec.last_updated_by || "System Registry"}</p>
                        <p className="mt-0.5">{spec.last_status_update ? formatDate(spec.last_status_update) : "Static schedule"}</p>
                      </td>

                      {/* 6. Save Action trigger */}
                      <td className="py-3.5 px-4 text-right">
                        {isModified && (
                          <button
                            onClick={() => handleSaveRow(spec.id)}
                            disabled={saving}
                            className="px-3 py-1 bg-[#10B981] hover:bg-emerald-600 disabled:opacity-40 text-xs font-bold text-white rounded flex items-center gap-1 cursor-pointer active:scale-95 transition-all ml-auto h-7 border border-[#10B981]"
                          >
                            {saving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Sync row
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BULK UPDATE MODAL COMPONENT (Section 8.8.6) */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[300] animate-page-fade">
          <div className="bg-[#0F172A] border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-card-in">
            
            {/* Modal Title */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-805">
              <h3 className="font-display font-extrabold text-sm text-gray-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                Batch Update Campus Specialists
              </h3>
              <button
                onClick={handleCloseBulkModal}
                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bulkResults ? (
              /* If bulk results has returned successfully */
              <div className="space-y-4 py-4">
                <p className="text-xs text-emerald-400 font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" /> Successful synchronizations roster log:
                </p>
                <div className="bg-[#080D16] p-3 border border-gray-800 rounded-lg max-h-48 overflow-y-auto space-y-2 text-xs text-gray-300 font-mono">
                  {bulkResults.map((r, i) => (
                    <div key={i} className="flex justify-between">
                      <span>✓ {r.name}</span>
                      <span className="text-emerald-500 font-bold">UPDATED</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleCloseBulkModal}
                  className="w-full py-2 bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Close & Refresh listing
                </button>
              </div>
            ) : (
              /* Modal form elements */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleBulkUpdate();
                }}
                className="space-y-4 pt-4"
              >
                <div className="p-3 bg-gray-950 rounded-xl text-xs text-gray-400 leading-relaxed font-sans border border-gray-850">
                  ⚠️ This batch transaction updates <strong>ALL</strong> active medical specialists scheduled on primary rotations at <strong>{branches.find(b=>b.id===bId)?.name}</strong> terminal today.
                </div>

                <div className="form-group flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Target Unified Status</label>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value as any)}
                    className="px-3 py-2 bg-[#080D16] border border-gray-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer w-full"
                  >
                    <option value="available">🟢 Available</option>
                    <option value="in_theatre">🟠 In Theatre</option>
                    <option value="on_leave">⚪ On Leave</option>
                    <option value="unavailable">🔴 Unavailable</option>
                    <option value="other_branch">🔵 At Other Branch</option>
                  </select>
                </div>

                <div className="form-group flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Administrative Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Bulk status update for National Holiday..."
                    value={bulkNotes}
                    onChange={(e) => setBulkNotes(e.target.value)}
                    required
                    maxLength={100}
                    className="px-3 py-2 bg-[#080D16] border border-gray-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-full"
                  />
                </div>

                <div className="flex gap-2 pt-4 justify-end">
                  <button
                    type="button"
                    onClick={handleCloseBulkModal}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                    disabled={bulkPosting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#10B981] hover:bg-emerald-600 disabled:opacity-45 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 border border-[#10B981]"
                    disabled={bulkPosting}
                  >
                    {bulkPosting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Apply to all specialists
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
export default AdminAvailability;
