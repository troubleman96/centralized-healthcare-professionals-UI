/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Grid, Layers, RefreshCw, X, SlidersHorizontal, BookOpen, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api.ts';
import { useToast } from '../toast.tsx';
import { Branch, Department, Specialist, SpecialistStatus } from '../types.ts';
import { cardStatusClass, statusBadge, relativeTime, getAvatarStyle, getInitials, STATUS_CONFIG } from '../utils.ts';

interface SearchPageProps {
  currentHash: string;
  onNavigate: (hash: string) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ currentHash, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('Any');
  const [selectedDept, setSelectedDept] = useState<string>('Any');
  const [selectedStatuses, setSelectedStatuses] = useState<SpecialistStatus[]>([]);
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'specialization'>('name');

  // Directory states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allSpecialists, setAllSpecialists] = useState<Specialist[]>([]);
  const [filteredSpecialists, setFilteredSpecialists] = useState<Specialist[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);

  const [loading, setLoading] = useState(true);
  const [liveUpdating, setLiveUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const toast = useToast();

  // 1. Decode URL parameters on mount
  useEffect(() => {
    // Standard hash-based query decoder: #/search?q=amina&branch=1
    const queryStr = currentHash.split('?')[1];
    if (queryStr) {
      const params = new URLSearchParams(queryStr);
      const q = params.get('q') || '';
      const b = params.get('branch') || 'Any';
      const d = params.get('dept') || 'Any';
      setSearchTerm(q);
      setSelectedBranch(b);
      setSelectedDept(d);
    }
  }, [currentHash]);

  // 2. Fetch Initial resources (departments, branches, specialists)
  const fetchResources = async () => {
    setLoading(true);
    try {
      const [resB, resD, resS] = await Promise.all([
        api.get('/branches/'),
        api.get('/departments/'),
        api.get('/specialists/')
      ]);

      if (resB.success) setBranches(resB.data);
      if (resD.success) setDepartments(resD.data);
      if (resS.success) setAllSpecialists(resS.data);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load clinical registries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  // 3. Periodic Background Refresh of just availability status (Every 60s)
  const refreshStatusesInPlace = async () => {
    setLiveUpdating(true);
    try {
      // Fetch today's live availability status
      const resLive = await api.get('/availability/today/');
      if (resLive.success) {
        const liveMap = new Map<number, { status: SpecialistStatus; last_update: string }>();
        resLive.data.forEach((item: any) => {
          liveMap.set(item.specialist_id, {
            status: item.status,
            last_update: item.last_status_update
          });
        });

        // Update main state list in place without full loading skeletons
        setAllSpecialists((prev) =>
          prev.map((s) => {
            const liveInfo = liveMap.get(s.id);
            if (liveInfo) {
              return {
                ...s,
                status: liveInfo.status,
                last_status_update: liveInfo.last_update
              };
            }
            return s;
          })
        );
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Live tickers refresh fell back.", err);
    } finally {
      setLiveUpdating(false);
    }
  };

  useEffect(() => {
    const statusInterval = setInterval(() => {
      refreshStatusesInPlace();
    }, 60000);
    return () => clearInterval(statusInterval);
  }, []);

  // 4. Perform dynamic filters on specialists list
  useEffect(() => {
    let result = [...allSpecialists];

    // Term search text
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.specialization.toLowerCase().includes(query) ||
          (departments.find((d) => d.id === s.department_id)?.name.toLowerCase().includes(query))
      );
    }

    // Branch selection
    if (selectedBranch !== 'Any') {
      const bId = parseInt(selectedBranch);
      result = result.filter((s) => {
        // If status is other_branch, status is available at the *other* campus currently
        const activeCampus = s.status === 'other_branch' ? (s.branch_id === 1 ? 2 : 1) : s.branch_id;
        return activeCampus === bId;
      });
    }

    // Department selection
    if (selectedDept !== 'Any') {
      const dId = parseInt(selectedDept);
      result = result.filter((s) => s.department_id === dId);
    }

    // Status checkboxes
    if (selectedStatuses.length > 0) {
      result = result.filter((s) => selectedStatuses.includes(s.status));
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'specialization') {
        return a.specialization.localeCompare(b.specialization);
      }
      return a.name.localeCompare(b.name);
    });

    setFilteredSpecialists(result);
    setCurrentPage(1); // Reset page index of search results
  }, [searchTerm, selectedBranch, selectedDept, selectedStatuses, allSpecialists, sortBy]);

  // 5. Pagination calculations
  const totalResults = filteredSpecialists.length;
  const totalPages = Math.ceil(totalResults / pageSize) || 1;
  const paginatedSpecialists = filteredSpecialists.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleStatusCheckbox = (status: SpecialistStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSelectedBranch('Any');
    setSelectedDept('Any');
    setSelectedStatuses([]);
    toast.info("Cleared all search filters.");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans animate-page-fade">
      
      {/* Search Layout header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-extrabold tracking-tight text-white flex items-center gap-2">
            Clinical Search Board
          </h1>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 shrink-0 text-[#10B981]" />
            Status registers updated: {relativeTime(lastUpdated.toISOString())}
            {liveUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#10B981]" />}
          </p>
        </div>
        
        {/* Filters and sort metrics header */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="md:hidden flex-1 flex justify-center items-center gap-2 px-3.5 py-2 border border-gray-800 bg-gray-900 rounded-lg text-xs font-semibold text-gray-300 active:scale-95 transition-all cursor-pointer"
            id="mobile_filter_toggle"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#10B981]" />
            Filters {selectedStatuses.length > 0 ? `(${selectedStatuses.length})` : ''}
          </button>
          
          <div className="flex items-center gap-2 bg-[#0F172A] border border-gray-800 rounded-lg p-1 text-xs shrink-0">
            <span className="text-gray-500 font-medium px-2">Sort by</span>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${sortBy === 'name' ? 'bg-[#10B981] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Name
            </button>
            <button
              onClick={() => setSortBy('specialization')}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${sortBy === 'specialization' ? 'bg-[#10B981] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Expertise
            </button>
          </div>

          <button
            onClick={refreshStatusesInPlace}
            className="p-2 border border-gray-800 bg-[#0F172A] hover:text-[#10B981] hover:border-[#10B981]/30 rounded-lg text-gray-400 transition-colors shrink-0"
            aria-label="Force live refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start relative">
        
        {/* STICKY SIDEBAR (Section 8.2) */}
        <aside className={`w-full md:w-[260px] shrink-0 bg-[#0F172A] border border-gray-800/80 p-5 rounded-xl space-y-6 md:sticky md:top-20 transition-all z-20 ${
          showMobileFilters ? 'block' : 'hidden md:block'
        }`}>
          <div className="flex justify-between items-center pb-3 border-b border-gray-800">
            <h3 className="font-display font-bold text-xs text-gray-200 flex items-center gap-2 uppercase tracking-wide">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#10B981]" />
              Filter parameters
            </h3>
            <button
              onClick={() => setShowMobileFilters(false)}
              className="md:hidden p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded"
              aria-label="Close filters"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick search input */}
          <div className="form-group flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Search Keyword</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-600" />
              <input
                type="text"
                placeholder="Dr. Name or expertise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-[#080D16] border border-gray-800 rounded-lg text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-emerald-500 transition-all font-sans"
              />
            </div>
          </div>

          {/* Branch filter (Section 8.2.1) */}
          <div className="form-group flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Hospital Campus</label>
            <div className="space-y-2 mt-1">
              <label className="flex items-center gap-2 text-xs text-gray-300 font-sans cursor-pointer select-none">
                <input
                  type="radio"
                  name="branch"
                  checked={selectedBranch === 'Any'}
                  onChange={() => setSelectedBranch('Any')}
                  className="accent-[#10B981]"
                />
                Any Campus
              </label>
              {branches.map(b => (
                <label key={b.id} className="flex items-center gap-2 text-xs text-gray-300 font-sans cursor-pointer select-none">
                  <input
                    type="radio"
                    name="branch"
                    checked={selectedBranch === b.id.toString()}
                    onChange={() => setSelectedBranch(b.id.toString())}
                    className="accent-[#10B981]"
                  />
                  {b.name.replace('MNH ', '')}
                </label>
              ))}
            </div>
          </div>

          {/* Department dropdown */}
          <div className="form-group flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-2.5 py-1.5 bg-[#080D16] border border-gray-800 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-emerald-500 cursor-pointer font-sans"
            >
              <option value="Any">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Availability Status Checkboxes */}
          <div className="form-group flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Current Status</label>
            <div className="space-y-2.5 mt-1">
              {(Object.keys(STATUS_CONFIG) as SpecialistStatus[]).map((st) => {
                const conf = STATUS_CONFIG[st];
                return (
                  <label key={st} className="flex items-center gap-2.5 text-xs text-gray-300 font-sans cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(st)}
                      onChange={() => toggleStatusCheckbox(st)}
                      className="accent-[#10B981] rounded text-[#10B981]"
                    />
                    <div className="flex-1 scale-85 -translate-x-3 origin-left" dangerouslySetInnerHTML={{ __html: statusBadge(st) }} />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Clear Filters CTA */}
          <button
            onClick={handleClearAllFilters}
            className="w-full py-1.5 border border-dashed border-gray-800 hover:border-gray-600 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-all cursor-pointer font-sans"
          >
            Clear All Filters
          </button>
        </aside>

        {/* RESULTS SCROLLABLE AREA */}
        <section className="flex-1 w-full space-y-6">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-medium font-sans">
              Found <strong className="text-emerald-400 font-bold">{totalResults}</strong> specialists matching request
            </span>
            <span className="text-gray-500 font-mono italic">
              Showing {paginatedSpecialists.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, totalResults)}
            </span>
          </div>

          {loading ? (
            /* Skeletons rendering */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-[#0F172A] border border-gray-800 rounded-xl p-4 space-y-4 shadow-sm animate-pulse">
                  <div className="flex gap-3">
                    <div className="shimmer-bg w-10 h-10 rounded shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="shimmer-bg h-3.5 w-3/4 rounded" />
                      <div className="shimmer-bg h-2.5 w-1/2 rounded" />
                    </div>
                  </div>
                  <div className="shimmer-bg h-3 w-1/3 rounded" />
                  <div className="shimmer-bg h-7 w-full rounded mt-3" />
                </div>
              ))}
            </div>
          ) : totalResults === 0 ? (
            /* Explicit Clean Empty States Section (Section 3.5.7) */
            <div className="py-16 flex flex-col items-center text-center max-w-sm mx-auto space-y-4 animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-500">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-gray-200">No Specialists Meet Filters</h3>
                <p className="text-xs text-gray-500 mt-1 font-sans">
                  We couldn't locate any active medical specialists meeting your current search query or filter selection. Try modifying the parameters.
                </p>
              </div>
              <button
                onClick={handleClearAllFilters}
                className="px-4 py-2 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 font-sans text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Reset Search
              </button>
            </div>
          ) : (
            /* specialist-card structural grids (Section 3.5.3) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="results_grid">
              {paginatedSpecialists.map((spec, index) => {
                const specDept = departments.find(d => d.id === spec.department_id);
                const specBranch = branches.find(b => b.id === spec.branch_id);
                const activeCampus = spec.status === 'other_branch' ? (spec.branch_id === 1 ? branches.find(br=>br.id===2) : branches.find(br=>br.id===1)) : specBranch;

                return (
                  <div
                    key={spec.id}
                    onClick={() => onNavigate(`#/specialist/${spec.id}`)}
                    className={`bg-[#0F172A] border border-gray-800 rounded-xl p-4 shadow-xl flex flex-col aspect-auto group hover:border-[#10B981]/30 transition-all duration-200 cursor-pointer select-none hover:-translate-y-1 ${cardStatusClass(spec.status)}`}
                    style={{ animation: 'cardIn 320ms cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${index * 40}ms` }}
                  >
                    {/* Header Row */}
                    <div className="flex justify-between items-start gap-2.5 pb-3">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded text-xs flex items-center justify-center shrink-0" style={getAvatarStyle(spec.name)}>
                          <span>{getInitials(spec.name)}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display font-bold text-sm text-gray-100 group-hover:text-emerald-400 transition-colors truncate">
                            {spec.name}
                          </h3>
                          <span className="text-[10px] text-gray-500 font-sans truncate block mt-0.5">
                            {spec.specialization}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badge Strip in Card */}
                    <div className="mt-1 pb-3" dangerouslySetInnerHTML={{ __html: statusBadge(spec.status) }} />

                    {/* Department and location labels */}
                    <div className="mt-auto pt-3 border-t border-gray-900 space-y-1.5 font-sans text-[11px] text-gray-400">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                        <span className="truncate">{specDept?.name || "Specialized Ward"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate text-gray-300 font-semibold">
                          {activeCampus?.name.replace('MNH ', '')}
                        </span>
                      </div>
                    </div>

                    {/* View Profile Action button */}
                    <button
                      className="w-full py-1.5 mt-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-center text-xs font-medium text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(`#/specialist/${spec.id}`);
                      }}
                    >
                      View Full Profile
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Navigation Controller */}
          {totalResults > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-800 text-xs font-sans">
              <div className="flex items-center gap-2 text-gray-400">
                <span>View Limit</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value) as any);
                    setCurrentPage(1);
                  }}
                  className="bg-[#0F172A] border border-gray-800 px-2 py-1 rounded text-xs select-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span>per screen</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1 || loading}
                  className="p-1.5 border border-gray-800 hover:border-gray-700 bg-[#0F172A] text-gray-300 rounded disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  aria-label="Previous results page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-gray-400 font-medium">
                  Page <strong className="text-white font-bold">{currentPage}</strong> of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages || loading}
                  className="p-1.5 border border-gray-800 hover:border-gray-700 bg-[#0F172A] text-gray-300 rounded disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  aria-label="Next results page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
export default SearchPage;
