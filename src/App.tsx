/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ToastProvider, useToast } from './toast.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { SearchPage } from './pages/SearchPage.tsx';
import { DetailPage } from './pages/DetailPage.tsx';
import { BookingPage } from './pages/BookingPage.tsx';
import { AppointmentsPage } from './pages/AppointmentsPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { UserProfilePage } from './pages/UserProfilePage.tsx';
import { AdminAvailability } from './pages/AdminAvailability.tsx';
import { AdminSpecialists } from './pages/AdminSpecialists.tsx';
import { ShieldAlert, BookOpen } from 'lucide-react';

export function CoreApp() {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const prevHashRef = useRef(window.location.hash || '#/');
  const toast = useToast();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('mnh-theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('mnh-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Custom Hash Router with warning locks (Section 8.8.5 - protects unsaved table modifications)
  useEffect(() => {
    const handleHashChange = () => {
      const nextHash = window.location.hash || '#/';
      
      if (hasUnsavedChanges) {
        const leave = window.confirm("You have unsaved availability changes. Leave anyway?");
        if (!leave) {
          // Revert hash to previous state
          window.removeEventListener('hashchange', handleHashChange);
          window.location.hash = prevHashRef.current;
          
          setTimeout(() => {
            window.addEventListener('hashchange', handleHashChange);
          }, 20);
          return;
        }
      }

      prevHashRef.current = nextHash;
      setCurrentHash(nextHash);
      window.scrollTo({ top: 0, behavior: 'instant' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [hasUnsavedChanges]);

  // Command router navigator
  const handleNavigate = (hash: string) => {
    window.location.hash = hash;
  };

  const renderActiveRoute = () => {
    // Basic prefix matching for variable parameters
    const hash = currentHash.trim();

    if (hash === '' || hash === '#/') {
      return <HomePage onNavigate={handleNavigate} />;
    }
    
    if (hash.startsWith('#/search')) {
      return <SearchPage currentHash={hash} onNavigate={handleNavigate} />;
    }

    if (hash.startsWith('#/specialist/')) {
      return <DetailPage currentHash={hash} onNavigate={handleNavigate} />;
    }

    if (hash.startsWith('#/book/')) {
      return <BookingPage currentHash={hash} onNavigate={handleNavigate} />;
    }

    if (hash === '#/appointments') {
      return <AppointmentsPage onNavigate={handleNavigate} />;
    }

    if (hash === '#/login') {
      return <LoginPage onNavigate={handleNavigate} />;
    }

    if (hash === '#/register') {
      return <RegisterPage onNavigate={handleNavigate} />;
    }

    if (hash === '#/profile') {
      return <UserProfilePage onNavigate={handleNavigate} />;
    }

    if (hash === '#/admin/availability') {
      return (
        <AdminAvailability
          currentHash={hash}
          onNavigate={handleNavigate}
          setHasUnsavedChanges={setHasUnsavedChanges}
        />
      );
    }

    if (hash === '#/admin/specialists') {
      return <AdminSpecialists onNavigate={handleNavigate} />;
    }

    // fallback 404 block conforming to Section 6.2
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4 font-sans animate-fade-up">
        <ShieldAlert className="w-16 h-16 text-[#10B981] mx-auto animate-bounce" />
        <h2 className="text-xl font-display font-bold text-gray-100">Roster Node Offline</h2>
        <p className="text-gray-400 text-xs">The directory link you followed doesn't match coordinate registries.</p>
        <button
          onClick={() => handleNavigate('#/')}
          className="px-4 py-2 bg-[#10B981] text-white text-xs font-bold rounded-lg cursor-pointer"
        >
          Return Homepage
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080D16] text-[#F1F5F9] font-sans">
      
      {/* Dynamic Role-Aware Persistent Navbar */}
      <Navbar
        currentHash={currentHash}
        onNavigate={handleNavigate}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Viewport Router Switch */}
      <main className="flex-1 pb-16 relative">
        {renderActiveRoute()}
      </main>

      {/* Clinical Footer */}
      <footer className="border-t border-gray-900 bg-[#070B12]/80 py-6 text-center text-[10px] text-gray-500 font-mono tracking-wider select-none shrink-0 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span>© {new Date().getFullYear()} MUHIMBILI NATIONAL HOSPITAL. ALL RIGHTS RESERVED.</span>
          <span>CRAFTED IN DAR ES SALAAM, TANZANIA</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <CoreApp />
    </ToastProvider>
  );
}
