/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, LogOut, User as UserIcon, Calendar, Filter, Radio, Shield, ListCollapse, Sun, Moon } from 'lucide-react';
import { getCurrentUser, auth } from '../auth.ts';
import { User } from '../types.ts';

interface NavbarProps {
  currentHash: string;
  onNavigate: (hash: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentHash,
  onNavigate,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync user state on hash changes / auth actions
  useEffect(() => {
    setUser(getCurrentUser());
  }, [currentHash]);

  // Handle clicking outside user dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    auth.logout();
    setDropdownOpen(false);
    onNavigate('#/login');
  };

  const isActive = (hashPattern: string) => {
    if (hashPattern === '#/' && (currentHash === '' || currentHash === '#/')) return true;
    return currentHash.startsWith(hashPattern) && hashPattern !== '#/';
  };

  const linkClass = (hashPattern: string) => {
    const active = isActive(hashPattern);
    return `px-3 py-2 text-sm font-medium transition-all duration-150 border-b-2 hover:text-[#10B981] ${
      active
        ? 'text-[#10B981] border-[#10B981]'
        : 'text-gray-400 border-transparent hover:border-[#10B981]/40'
    }`;
  };

  const renderNavLinks = () => {
    if (!user) {
      return (
        <>
          <button onClick={() => { onNavigate('#/'); setMobileOpen(false); }} className={linkClass('#/')}>Home</button>
          <button onClick={() => { onNavigate('#/search'); setMobileOpen(false); }} className={linkClass('#/search')}>Find Specialist</button>
        </>
      );
    }

    if (user.role === 'patient') {
      return (
        <>
          <button onClick={() => { onNavigate('#/'); setMobileOpen(false); }} className={linkClass('#/')}>Home</button>
          <button onClick={() => { onNavigate('#/search'); setMobileOpen(false); }} className={linkClass('#/search')}>Find Specialist</button>
          <button onClick={() => { onNavigate('#/appointments'); setMobileOpen(false); }} className={linkClass('#/appointments')}>My Appointments</button>
        </>
      );
    }

    if (user.role === 'branch_admin') {
      return (
        <>
          <button onClick={() => { onNavigate('#/admin/availability'); setMobileOpen(false); }} className={linkClass('#/admin/availability')}>Live Status Board</button>
        </>
      );
    }

    if (user.role === 'super_admin') {
      return (
        <>
          <button onClick={() => { onNavigate('#/admin/availability'); setMobileOpen(false); }} className={linkClass('#/admin/availability')}>Sync Board</button>
          <button onClick={() => { onNavigate('#/admin/specialists'); setMobileOpen(false); }} className={linkClass('#/admin/specialists')}>Specialist Roster</button>
        </>
      );
    }

    return null;
  };

  return (
    <nav className="border-b border-gray-800 bg-[#0F172A]/90 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Left: Logo */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => onNavigate('#/')}>
            <div className="w-1.5 h-6 bg-[#10B981] rounded-sm" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-xl tracking-tight text-white leading-none">MNH</span>
              <span className="text-[10px] text-gray-400 font-sans tracking-wider uppercase">Healthcare Directory</span>
            </div>
          </div>

          {/* Desktop Centre Links */}
          <div className="hidden md:flex items-center space-x-2">
            {renderNavLinks()}
          </div>

          {/* Desktop Right: Login/Profile */}
          <div className="hidden md:flex items-center">
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              type="button"
              className="p-2 mr-3 rounded-lg border border-transparent text-gray-400 hover:text-[#10B981] hover:bg-gray-800/40 hover:border-gray-800 transition-all cursor-pointer active:scale-95"
              aria-label="Toggle visual theme"
              title={theme === 'dark' ? 'Switch to Green & White light theme' : 'Switch to Dark & Green theme'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-600" />
              )}
            </button>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/80 rounded-lg text-sm text-gray-200 transition-all active:scale-[0.98]"
                >
                  <div className="w-6 h-6 rounded-md bg-[#10B981]/15 text-[#10B981] font-display font-bold flex items-center justify-center text-xs">
                    {user.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}
                  </div>
                  <span className="font-sans font-medium max-w-[130px] truncate">{user.fullName}</span>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg bg-[#0F172A] border border-gray-800 shadow-xl py-1 text-sm z-50 font-sans animate-fade-up">
                    <div className="px-4 py-2.5 border-b border-gray-800 bg-[#080D16]/50">
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Signed In As</p>
                      <p className="font-semibold text-gray-100 truncate mt-0.5">{user.fullName}</p>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-1 font-mono uppercase font-semibold">
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                    {user.role === 'patient' && (
                      <button
                        onClick={() => { setDropdownOpen(false); onNavigate('#/appointments'); }}
                        className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4 text-gray-400" />
                        My Appts
                      </button>
                    )}
                    {(user.role === 'branch_admin' || user.role === 'super_admin') && (
                      <button
                        onClick={() => { setDropdownOpen(false); onNavigate('#/admin/availability'); }}
                        className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <Shield className="w-4 h-4 text-indigo-400" />
                        Availability Board
                      </button>
                    )}
                    <button
                      onClick={() => { setDropdownOpen(false); onNavigate('#/profile'); }}
                      className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      My Profile
                    </button>
                    <div className="border-t border-gray-800 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('#/login')}
                className="px-4 py-1.5 bg-[#10B981] hover:bg-emerald-600 active:scale-[0.97] text-white font-sans text-xs font-semibold rounded-lg transition-all shadow-md shadow-emerald-500/10"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Hamburger menu */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              type="button"
              className="p-1.5 rounded-lg border border-transparent text-gray-400 hover:text-[#10B981] hover:bg-gray-800/40 transition-all cursor-pointer active:scale-95"
              aria-label="Toggle visual theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4.5 h-4.5 text-amber-400" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-emerald-600" />
              )}
            </button>

            {!user && (
              <button
                onClick={() => onNavigate('#/login')}
                className="px-3 py-1 bg-[#10B981] text-white font-sans text-xs font-semibold rounded-md mr-1"
              >
                Sign In
              </button>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/80 transition-colors"
              aria-label="Toggle main menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer (Smooth Max Height slide-down) */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 border-gray-800 ${
          mobileOpen ? 'max-h-72 border-b bg-[#0F172A]' : 'max-h-0 border-b-0'
        }`}
      >
        <div className="px-4 pt-2 pb-4 space-y-1.5 flex flex-col font-sans">
          {renderNavLinks()}
          {user && (
            <div className="pt-2 border-t border-gray-800 mt-2">
              <div className="px-3 py-2 text-xs text-gray-400 mb-1">
                Role: <span className="text-[#10B981] font-bold font-mono">{user.role}</span>
              </div>
              <button
                onClick={() => { setMobileOpen(false); onNavigate('#/profile'); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-md flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4" /> My Profile
              </button>
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="w-full text-left px-3 py-2 text-sm text-rose-400 hover:bg-rose-950/20 rounded-md flex items-center gap-2 mt-1"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
