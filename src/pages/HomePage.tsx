/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, MapPin, CheckCircle, Activity, Calendar, ArrowRight, RefreshCw, Compass } from 'lucide-react';
import { api } from '../api.ts';
import { useToast } from '../toast.tsx';
import { Branch, Specialist } from '../types.ts';
import { statusBadge, relativeTime, getAvatarStyle, getInitials } from '../utils.ts';

interface HomePageProps {
  onNavigate: (hash: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  
  // Live counts for Right Panel Today's Summary
  const [availableUpanga, setAvailableUpanga] = useState<number | null>(null);
  const [availableMloganzila, setAvailableMloganzila] = useState<number | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingTicker, setLoadingTicker] = useState(true);
  
  const [lastFetched, setLastFetched] = useState<Date>(new Date());
  const toast = useToast();

  const fetchData = async () => {
    try {
      // 1. Fetch Branches
      setLoadingBranches(true);
      const resB = await api.get('/branches/');
      if (resB.success) setBranches(resB.data);
      setLoadingBranches(false);

      // 2. Fetch Availability Counts for Today
      setLoadingSummary(true);
      const resU = await api.get('/availability/today/?branch=1');
      const resM = await api.get('/availability/today/?branch=2');
      
      if (resU.success) {
        // Count specialists where status is active/available at Upanga
        const countU = resU.data.filter((item: any) => item.status === 'available').length;
        setAvailableUpanga(countU);
      }
      if (resM.success) {
        const countM = resM.data.filter((item: any) => item.status === 'available').length;
        setAvailableMloganzila(countM);
      }
      setLoadingSummary(false);

      // 3. Fetch all specialists for live availability strip
      setLoadingTicker(true);
      const resS = await api.get('/specialists/');
      if (resS.success) setSpecialists(resS.data);
      setLoadingTicker(false);

      setLastFetched(new Date());
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to sync some healthcare live registers.");
    }
  };

  useEffect(() => {
    fetchData();

    // Conforming to Section 9: Auto-Refresh System every 60 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(`#/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      onNavigate('#/search');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-12 animate-page-fade">
      
      {/* SECTION 1: HERO SCREEN */}
      <section className="bg-gradient-to-r from-[#0F172A] via-[#101E35] to-[#0F172A] p-8 md:p-10 rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden bg-grid-pattern">
        
        {/* Glow gradient nodes */}
        <div className="absolute -top-24 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-30 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Hero half */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-[#10B981] border border-emerald-500/20 rounded-full text-xs font-semibold uppercase tracking-wider w-fit">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              Muhimbili National Hospital (MNH)
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-extrabold tracking-tight text-white leading-[1.1] animate-fade-up">
              Find Your Specialist.<br />
              <span className="text-[#10B981]">Know Before You Go.</span>
            </h1>
            <p className="text-sm md:text-base text-gray-300 leading-relaxed max-w-xl animate-fade-up style-delay-100">
              MNH operates branches separated by 25 km (Upanga & Mloganzila). Avoid unnecessary travel by checking live specialist availability and booking beforehand.
            </p>

            {/* Search Input Bar template (Section 8.1.1) */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-lg bg-[#080D16]/60 p-1.5 border border-gray-800 rounded-xl focus-within:border-emerald-500/80 focus-within:ring-1 focus-within:ring-[#10B981]/50 transition-all">
              <div className="flex-1 flex items-center pl-2">
                <Search className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by name, specialization, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none pl-2 text-sm text-gray-100 placeholder-gray-600 font-sans"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2 bg-[#10B981] hover:bg-emerald-600 text-white font-sans text-xs font-bold rounded-lg cursor-pointer shrink-0 transition-colors"
              >
                Search
              </button>
            </form>
          </div>

          {/* Right Live summary counts panel */}
          <div className="lg:col-span-5">
            <div className="bg-[#080D16]/80 backdrop-blur-md rounded-xl border border-gray-800 p-6 flex flex-col space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-800/85">
                <h3 className="font-display font-bold text-sm text-gray-200">Today's Live Campus Summary</h3>
                <span className="inline-flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
                  <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse" />
                  LIVE COUNTS
                </span>
              </div>

              {loadingSummary ? (
                <div className="space-y-4 py-8">
                  <div className="shimmer-bg h-4 w-3/4 rounded" />
                  <div className="shimmer-bg h-4 w-1/2 rounded" />
                </div>
              ) : (
                <div className="space-y-3 font-sans">
                  {/* Row Upanga */}
                  <div className="flex justify-between items-center p-3 bg-[#0F172A] border border-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold">
                        UP
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-200">MNH Upanga Terminal</p>
                        <p className="text-[10px] text-gray-400">Main Campus</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-display font-black text-emerald-400 leading-none block">
                        {availableUpanga ?? 0}
                      </span>
                      <span className="text-[9px] text-gray-300 font-semibold tracking-wider font-mono">AVAILABLE</span>
                    </div>
                  </div>

                  {/* Row Mloganzila */}
                  <div className="flex justify-between items-center p-3 bg-[#0F172A] border border-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-bold">
                        ML
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-200">MNH Mloganzila Campus</p>
                        <p className="text-[10px] text-gray-400">25 km Outward Campus</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-display font-black text-blue-400 leading-none block">
                        {availableMloganzila ?? 0}
                      </span>
                      <span className="text-[9px] text-gray-300 font-semibold tracking-wider font-mono">AVAILABLE</span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-500 text-center font-sans mt-2">
                Click "Search" or "Explore" to filter specialist details at each terminal.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 2: LIVE AVAILABILITY STRIP */}
      <section className="bg-gray-950/60 p-5 rounded-xl border border-gray-800/80 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
            </span>
            <h2 className="font-display font-bold text-sm tracking-wide text-gray-200">
              Live Specialist Ticker Board
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span id="last-updated" className="text-[10px] text-gray-400 font-mono">
              Last synced: {relativeTime(lastFetched.toISOString())}
            </span>
            <button
              onClick={fetchData}
              className="p-1 text-gray-400 hover:text-emerald-400 hover:bg-gray-800 rounded transition-colors"
              aria-label="Refresh live data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal Ticker container */}
        <div className="overflow-x-auto pb-2 flex gap-3 scrollbar-custom select-none" id="ticker_container">
          {loadingTicker ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-44 h-12 bg-[#0F172A] border border-gray-800 rounded-lg p-2.5 flex gap-2 items-center">
                <div className="shimmer-bg w-7 h-7 rounded-md shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="shimmer-bg h-2 w-3/4 rounded" />
                  <div className="shimmer-bg h-2 w-1/2 rounded" />
                </div>
              </div>
            ))
          ) : specialists.length === 0 ? (
            <p className="text-xs text-gray-500 font-sans">No specialists found currently on rotation.</p>
          ) : (
            specialists.map((spec) => (
              <div
                key={spec.id}
                onClick={() => onNavigate(`#/specialist/${spec.id}`)}
                className="flex-shrink-0 w-fit max-w-[210px] bg-[#0F172A] border border-gray-800 hover:border-gray-700 hover:bg-[#121D33]/40 rounded-lg p-2.5 flex items-center gap-3 cursor-pointer transition-all active:scale-[0.98]"
              >
                <div className="w-7 h-7 rounded bg-gray-900 border border-gray-800 flex items-center justify-center shrink-0" style={getAvatarStyle(spec.name)}>
                  <span className="text-[9px] font-bold font-display">{getInitials(spec.name)}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-gray-200 truncate leading-none">{spec.name}</span>
                  <span className="text-[9px] text-gray-500 truncate leading-relaxed mt-0.5">{spec.specialization}</span>
                  <div className="mt-1 flex items-center gap-1.5" dangerouslySetInnerHTML={{ __html: statusBadge(spec.status) }} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* SECTION 3: CAMPUS SELECTION CARDS */}
      <section className="space-y-4">
        <div className="flex flex-col text-center sm:text-left">
          <h2 className="text-xl font-display font-bold text-gray-100">Select MNH Hospital Campus</h2>
          <p className="text-xs text-gray-400 mt-1">Explore medical directories and specialist availability by campus</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loadingBranches ? (
            Array(2).fill(0).map((_, i) => (
              <div key={i} className="bg-[#0F172A] border border-gray-800 h-40 rounded-xl p-6 space-y-3">
                <div className="shimmer-bg h-4 w-1/3 rounded" />
                <div className="shimmer-bg h-4 w-2/3 rounded" />
                <div className="shimmer-bg h-8 w-1/4 rounded mt-4" />
              </div>
            ))
          ) : (
            branches.map((b, idx) => (
              <div
                key={b.id}
                className="bg-[#0F172A] border border-gray-800 rounded-xl p-6 relative overflow-hidden group hover:border-[#10B981]/50 hover:shadow-xl transition-all duration-200"
              >
                {/* Visual side accent */}
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  b.id === 1 ? 'bg-emerald-500' : 'bg-blue-500'
                }`} />

                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg shrink-0 ${
                    b.id === 1 ? 'bg-emerald-500/10 text-[#10B981]' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-display font-bold text-base text-gray-100">{b.name}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed font-sans">{b.address}</p>
                    <button
                      onClick={() => onNavigate(`#/search?branch=${b.id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10B981] hover:text-emerald-400 mt-4 cursor-pointer"
                    >
                      View Campus specialists
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* SECTION 4: HOW IT WORKS STORYBOARD */}
      <section className="bg-[#0F172A]/40 border border-gray-800/80 rounded-2xl p-8 space-y-6">
        <div className="text-center max-w-lg mx-auto">
          <h2 className="text-lg font-display font-bold text-gray-100">Synchronized Clinical Directory</h2>
          <p className="text-xs text-gray-400 mt-1">Make informed trips and secure appointment confirmations in three simple steps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center p-4 rounded-xl border border-gray-800/60 bg-[#0F172A]/75">
            <div className="w-7 h-7 bg-[#10B981]/10 text-[#10B981] border border-emerald-500/20 rounded-full font-mono text-xs font-bold flex items-center justify-center mb-3">
              1
            </div>
            <Search className="w-6 h-6 text-emerald-400 mb-2" />
            <h4 className="font-display font-bold text-sm text-gray-200">Search Specialities</h4>
            <p className="text-xs text-gray-400 leading-relaxed max-w-[210px] mt-1.5 font-sans">
              Filter by name keyword, branch terminal, or medical department lists.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center p-4 rounded-xl border border-gray-800/60 bg-[#0F172A]/75">
            <div className="w-7 h-7 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-mono text-xs font-bold flex items-center justify-center mb-3">
              2
            </div>
            <CheckCircle className="w-6 h-6 text-blue-400 mb-2" />
            <h4 className="font-display font-bold text-sm text-gray-200">Verify Status</h4>
            <p className="text-xs text-gray-400 leading-relaxed max-w-[210px] mt-1.5 font-sans">
              Instantly view live color indicators matching availability.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center p-4 rounded-xl border border-gray-800/60 bg-[#0F172A]/75">
            <div className="w-7 h-7 bg-[#10B981]/10 text-[#10B981] border border-emerald-500/20 rounded-full font-mono text-xs font-bold flex items-center justify-center mb-3">
              3
            </div>
            <Calendar className="w-6 h-6 text-emerald-400 mb-2" />
            <h4 className="font-display font-bold text-sm text-gray-200">Book Instantly</h4>
            <p className="text-xs text-gray-400 leading-relaxed max-w-[210px] mt-1.5 font-sans">
              Reserve certified time slots and avoid queues or separation.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
};
export default HomePage;
