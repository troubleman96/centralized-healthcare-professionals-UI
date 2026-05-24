/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldAlert, User, Mail, Plus, Edit, Trash2, Check, X, Search, Loader2, Library, MapPin, AlignLeft, ToggleLeft, ToggleRight, LayoutGrid } from 'lucide-react';
import { api } from '../api.ts';
import { getCurrentUser } from '../auth.ts';
import { useToast } from '../toast.tsx';
import { Specialist, Branch, Department, SpecialistStatus } from '../types.ts';
import { getAvatarStyle, getInitials, cardStatusClass } from '../utils.ts';

interface AdminSpecialistsProps {
  onNavigate: (hash: string) => void;
}

export const AdminSpecialists: React.FC<AdminSpecialistsProps> = ({ onNavigate }) => {
  const user = getCurrentUser();
  const toast = useToast();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & searches
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('Any');

  // Deactivate inline prompt track
  // ID -> true
  const [deactivatingIds, setDeactivatingIds] = useState<Record<number, boolean>>({});

  // Drawer (Create/Edit) States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerExit, setDrawerExit] = useState(false); // Handles exit keyframe
  const [editingId, setEditingId] = useState<number | null>(null); // null means "Create" mode
  const [posting, setPosting] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSpecialization, setFormSpecialization] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formActive, setFormActive] = useState(true);

  // Guard routing on mount (Section 8.9)
  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      toast.error("Unauthorized directory permissions.");
      onNavigate('#/');
    }
  }, [user]);

  // Read Resources
  const fetchResources = async () => {
    setLoading(true);
    try {
      const [resB, resD, resS] = await Promise.all([
        api.get('/branches/'),
        api.get('/departments/'),
        api.get('/specialists/?all=true') // Fetch deactivated too
      ]);

      if (resB.success) setBranches(resB.data);
      if (resD.success) setDepartments(resD.data);
      if (resS.success) setSpecialists(resS.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to read registry tables.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  // Listen for Escape key to close the drawer (Section 8.9.4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) {
        handleCloseDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  // Reactive selector filtering (Section 8.9.4 - Branch Select changes dynamically filters departments)
  const filteredFormDepartments = departments.filter(d => {
    if (!formBranchId) return true;
    return d.branch_ids.includes(parseInt(formBranchId));
  });

  // Automatically reset department selection if it doesn't fit the reactive branch filter
  useEffect(() => {
    if (formBranchId && formDeptId) {
      const valid = filteredFormDepartments.some(d => d.id === parseInt(formDeptId));
      if (!valid) setFormDeptId('');
    }
  }, [formBranchId, filteredFormDepartments]);

  const handleOpenCreateDrawer = () => {
    setEditingId(null);
    setFormName('');
    setFormEmail('');
    setFormSpecialization('');
    setFormBranchId(branches[0]?.id.toString() || '1');
    setFormDeptId('');
    setFormBio('');
    setFormPhoto('');
    setFormActive(true);
    
    setDrawerExit(false);
    setDrawerOpen(true);
  };

  const handleOpenEditDrawer = (spec: Specialist) => {
    setEditingId(spec.id);
    setFormName(spec.name);
    setFormEmail(spec.email);
    setFormSpecialization(spec.specialization);
    setFormBranchId(spec.branch_id.toString());
    setFormDeptId(spec.department_id.toString());
    setFormBio(spec.bio || '');
    setFormPhoto(spec.photo_url || '');
    setFormActive(spec.is_active);

    setDrawerExit(false);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerExit(true);
    // Delay slightly to finish exit keyframe animation smoothly (Section 8.9.4)
    setTimeout(() => {
      setDrawerOpen(false);
      setDrawerExit(false);
    }, 240);
  };

  // Submit create or edit form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validations
    if (!formName.trim() || !formSpecialization.trim() || !formBranchId || !formDeptId) {
      toast.warning("Please fill out all required fields complete.");
      return;
    }

    setPosting(true);

    const payload = {
      name: formName.trim(),
      email: formEmail.trim() || `${formName.toLowerCase().replace(/\s+/g, '.')}@mnh.or.tz`,
      specialization: formSpecialization.trim(),
      branch_id: parseInt(formBranchId),
      department_id: parseInt(formDeptId),
      bio: formBio.trim(),
      photo_url: formPhoto.trim(),
      is_active: formActive
    };

    try {
      if (editingId) {
        // Edit Row (PATCH)
        const res = await api.patch(`/specialists/${editingId}/`, payload);
        if (res.success) {
          toast.success(`Updated ${formName.split(' ')[0]}'s registry successfully!`);
          handleCloseDrawer();
          fetchResources(); // reload tables
        }
      } else {
        // Create Row (POST)
        const res = await api.post('/specialists/', payload);
        if (res.success) {
          toast.success(`Registered Dr. ${formName.split(' ')[0]} to hospital rosters!`);
          handleCloseDrawer();
          fetchResources();
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile registry.");
    } finally {
      setPosting(false);
    }
  };

  // Inline Reactivation/Deactivation flow (Section 8.9)
  const handleToggleActiveState = async (spec: Specialist) => {
    const nextActive = !spec.is_active;
    
    try {
      const res = await api.patch(`/specialists/${spec.id}/`, { is_active: nextActive });
      if (res.success) {
        toast.success(`Successfully ${nextActive ? 'reactivated' : 'deactivated'} Dr. ${spec.name.split(' ').slice(-1)}`);
        
        // Update local list
        setSpecialists(prev =>
          prev.map(s => (s.id === spec.id ? { ...s, is_active: nextActive } : s))
        );

        // Wipe deactivating prompt State
        setDeactivatingIds(prev => {
          const c = { ...prev };
          delete c[spec.id];
          return c;
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update directory status.");
    }
  };

  const toggleDeactivateConfirmationVisible = (specId: number) => {
    setDeactivatingIds(prev => ({ ...prev, [specId]: !prev[specId] }));
  };

  // Filter listings
  const filteredSpecialists = specialists.filter(s => {
    const isBranch = branchFilter === 'Any' || s.branch_id.toString() === branchFilter;
    const isSearch = !searchTerm.trim() || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    return isBranch && isSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8 animate-page-fade">
      
      {/* Roster Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold tracking-tight text-white flex items-center gap-2">
            Central Specialist Registry
          </h1>
          <p className="text-xs text-gray-450 mt-1 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-500 shrink-0" />
            Super Administrator controls: Register, Edit, and toggle Roster listings
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={handleOpenCreateDrawer}
          className="px-4 py-2 bg-[#10B981] hover:bg-emerald-600 active:scale-95 text-white font-sans text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shrink-0 border border-[#10B981] shadow-lg shadow-emerald-500/10"
          id="add_specialist_btn"
        >
          <Plus className="w-4 h-4" />
          Add Specialist
        </button>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="bg-gray-950 p-4 rounded-xl border border-gray-850 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex items-center pl-2 bg-[#0F172A] border border-gray-800 rounded-lg">
          <Search className="w-4 h-4 text-gray-600 shrink-0" />
          <input
            type="text"
            placeholder="Search roster list by specialist name keyword or expertise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent pl-2 py-2 outline-none text-xs text-gray-200 placeholder-gray-650 font-sans"
          />
        </div>

        <div className="flex gap-2 items-center text-xs text-gray-400 shrink-0 w-full sm:w-auto">
          <span>Sort Campus:</span>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-2 bg-[#0F172A] border border-gray-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-505 cursor-pointer w-full sm:w-auto"
          >
            <option value="Any">All Terminals</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name.replace('MNH ', '')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* MASTER REGISTRY DIRECTORY TABLE */}
      <div className="bg-[#0F172A] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-[#080D16]/50 text-gray-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3.5 px-4">Specialist Roster</th>
                <th className="py-3.5 px-4">Rotational Campus</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Directory Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 table-cell text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500 font-sans">
                      <Loader2 className="w-4 h-4 animate-spin text-[#10B981]" />
                      Reading active rosters...
                    </div>
                  </td>
                </tr>
              ) : filteredSpecialists.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500 font-sans italic">
                    No specialists listed in central registers.
                  </td>
                </tr>
              ) : (
                filteredSpecialists.map((spec) => {
                  const specDept = departments.find(d => d.id === spec.department_id);
                  const specBranch = branches.find(b => b.id === spec.branch_id);
                  const showDeactivatePrompt = deactivatingIds[spec.id] || false;

                  return (
                    <tr key={spec.id} className="hover:bg-[#121A2C]/25 transition-all text-gray-300">
                      {/* 1. Specialist */}
                      <td className="py-3.5 px-4">
                        <div className="flex gap-3 items-center">
                          <div className="w-10 h-10 rounded shrink-0 flex items-center justify-center text-xs font-bold leading-none border border-gray-850" style={getAvatarStyle(spec.name)}>
                            <span>{getInitials(spec.name)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-200 truncate">{spec.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono truncate lowercase">{spec.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Campus */}
                      <td className="py-3.5 px-4 text-gray-200 font-medium">
                        {specBranch?.name ? specBranch.name.replace('MNH ', '') : "Main Terminal"}
                      </td>

                      {/* 3. Department */}
                      <td className="py-3.5 px-4 text-gray-400 capitalize">
                        {specDept?.name ? specDept.name.replace(' & ', ' / ') : "Physiology"}
                      </td>

                      {/* 4. Active state status indicator badge */}
                      <td className="py-3.5 px-4">
                        {spec.is_active ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-gray-400 border border-gray-700 font-bold font-mono">
                            INACTIVE
                          </span>
                        )}
                      </td>

                      {/* 5. Quick action panel (Edit, In-line Deactivations) (Section 8.9.2) */}
                      <td className="py-3.5 px-4 text-right">
                        {showDeactivatePrompt ? (
                          /* INLINE DEACTIVATE TRIGGER (STRICTLY NO MODAL DEACTIVATE DIALOGS) (Section 8.9) */
                          <div className="inline-flex items-center gap-2 p-1.5 bg-rose-950/20 border border-rose-500/20 rounded-lg animate-fade-up">
                            <span className="text-[9px] text-rose-300 font-bold font-sans">
                              Confirm?
                            </span>
                            <button
                              onClick={() => handleToggleActiveState(spec)}
                              className="px-2 py-0.5 bg-[#DC2626] hover:bg-red-700 font-sans text-white text-[9px] font-bold rounded cursor-pointer leading-relaxed"
                            >
                              Yes, toggle
                            </button>
                            <button
                              onClick={() => toggleDeactivateConfirmationVisible(spec.id)}
                              className="px-2 py-0.5 bg-gray-900 border border-gray-800 text-gray-300 hover:text-white text-[9px] font-bold rounded cursor-pointer leading-relaxed"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 justify-end">
                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEditDrawer(spec)}
                              className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-emerald-450 border border-transparent hover:border-gray-800 rounded transition-all cursor-pointer"
                              title="Edit Registry details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Deactivate switch button */}
                            <button
                              onClick={() => toggleDeactivateConfirmationVisible(spec.id)}
                              className={`px-2 py-1 border rounded text-[10px] font-bold active:scale-95 transition-all cursor-pointer ${
                                spec.is_active
                                  ? 'border-rose-500/20 hover:bg-rose-500/10 text-rose-400'
                                  : 'border-emerald-500/20 hover:bg-emerald-500/10 text-[#10B981]'
                              }`}
                              title={spec.is_active ? 'Deactivate from listing' : 'Reactivate directory'}
                            >
                              {spec.is_active ? "Deactivate" : "Reactivate"}
                            </button>
                          </div>
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

      {/* CREATE AND EDIT PROFILE SLIDE-IN DRAWER (Section 8.9.3) */}
      {drawerOpen && (
        <label className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] animate-page-fade pointer-events-auto">
          {/* Drawer content board */}
          <div
            className={`fixed top-0 right-0 h-full w-full sm:w-[500px] bg-[#0F172A] border-l border-gray-800 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto ${
              drawerExit ? 'animate-slide-out-right' : 'animate-slide-in-right'
            }`}
            style={{
              animation: drawerExit
                ? 'slideOutRight 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
                : 'slideInRight 320ms cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
            {/* Form */}
            <form onSubmit={handleSubmitForm} className="space-y-5 flex-1 flex flex-col justify-between">
              
              {/* Drawer Title Header */}
              <div className="flex justify-between items-center pb-3 border-b border-gray-850">
                <h3 className="font-display font-black text-sm text-gray-100 uppercase tracking-widest">
                  {editingId ? "Modify Specialist details" : "Register Specialist Specialist"}
                </h3>
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Form Areas */}
              <div className="space-y-4 pt-4 flex-1 overflow-y-auto pb-4 scrollbar-custom">
                {/* 1. Full name */}
                <div className="form-group flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase font-mono font-bold text-gray-450 tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#10B981]" /> Full Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Frank Minja"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    disabled={posting}
                    className="px-3 py-2 bg-[#080D16] border border-gray-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-full"
                  />
                </div>

                {/* 2. Specialization */}
                <div className="form-group flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase font-mono font-bold text-gray-450 tracking-wider flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-[#10B981]" /> Professional Specialization <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Radiation Oncologist"
                    value={formSpecialization}
                    onChange={(e) => setFormSpecialization(e.target.value)}
                    required
                    disabled={posting}
                    className="px-3 py-2 bg-[#080D16] border border-gray-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-full"
                  />
                </div>

                {/* 3. Official Email */}
                <div className="form-group flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase font-mono font-bold text-gray-450 tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#10B981]" /> Official Hospital Mail
                  </label>
                  <input
                    type="email"
                    placeholder="e.g., frank.minja@mnh.or.tz"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    disabled={posting}
                    className="px-3 py-2 bg-[#080D16] border border-gray-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-full"
                  />
                  <p className="text-[9px] text-gray-500 italic">If left empty, a corporate address is dynamically crafted from their legal name.</p>
                </div>

                {/* 4. Branch Selector */}
                <div className="form-group flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase font-mono font-bold text-gray-450 tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#10B981]" /> Attending Campus Terminal <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    required
                    disabled={posting}
                    className="px-3 py-2 bg-[#080D16] border border-gray-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-505 cursor-pointer w-full"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Reactive Department Selector */}
                <div className="form-group flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase font-mono font-bold text-gray-450 tracking-wider flex items-center gap-1.5">
                    <Library className="w-3.5 h-3.5 text-[#10B981]" /> Clinical Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formDeptId}
                    onChange={(e) => setFormDeptId(e.target.value)}
                    required
                    disabled={posting}
                    className="px-3 py-2 bg-[#080D16] border border-gray-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-505 cursor-pointer w-full"
                  >
                    <option value="">-- Choose department --</option>
                    {filteredFormDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* 6. Bio */}
                <div className="form-group flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase font-mono font-bold text-gray-450 tracking-wider flex items-center gap-1.5">
                    <AlignLeft className="w-3.5 h-3.5 text-[#10B981]" /> Roster Biography Overview
                  </label>
                  <textarea
                    placeholder="Enter overview bio, specialized research items, and historical background..."
                    value={formBio}
                    onChange={(e) => setFormBio(e.target.value)}
                    disabled={posting}
                    className="px-3 py-2 bg-[#080D16] border border-gray-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-full min-h-[80px]"
                  />
                </div>

                {/* 7. Active switch */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-900 select-none">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-300">Roster Publication Status</label>
                    <p className="text-[9px] text-gray-500 leading-normal mt-0.5">Defines if the specialist details appear published in search results.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormActive(!formActive)}
                    className="p-1 focus:outline-none shrink-0"
                  >
                    {formActive ? (
                      <ToggleRight className="w-10 h-10 text-[#10B981] cursor-pointer" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-600 cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>

              {/* Drawer Footer Buttons */}
              <div className="flex gap-2.5 pt-4 border-t border-gray-850 justify-end shrink-0">
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-300 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                  disabled={posting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#10B981] hover:bg-emerald-600 disabled:opacity-55 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 border border-[#10B981]"
                  disabled={posting}
                >
                  {posting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Specialist Profile
                </button>
              </div>

            </form>
          </div>
        </label>
      )}

    </div>
  );
};
export default AdminSpecialists;
