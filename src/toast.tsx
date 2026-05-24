/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, AlertOctagon } from 'lucide-react';
import { ToastMessage } from './types.ts';

interface ToastContextType {
  toasts: ToastMessage[];
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
  info: (msg: string) => void;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeValue = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
      // Conforming to the restriction: Max 4 visible.
      const current = [...prev];
      if (current.length >= 4) {
        current.pop();
      }
      return [{ id, type, message }, ...current];
    });
    
    // Auto-dismiss in 4 seconds conformant to spec.
    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const success = useCallback((msg: string) => addToast('success', msg), [addToast]);
  const errorObj = useCallback((msg: string) => addToast('error', msg), [addToast]);
  const warning = useCallback((msg: string) => addToast('warning', msg), [addToast]);
  const info = useCallback((msg: string) => addToast('info', msg), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, success, error: errorObj, warning, info, remove: removeValue }}>
      {children}
      <div 
        id="toast-container" 
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-[360px] w-full"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((t) => {
          let borderClass = 'border-l-4 border-l-slate-400';
          let bgClass = 'bg-[#1E293B]';
          let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;

          if (t.type === 'success') {
            borderClass = 'border-l-4 border-l-[#10B981]';
            bgClass = 'bg-[#0B1510]';
            icon = <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />;
          } else if (t.type === 'error') {
            borderClass = 'border-l-4 border-l-[#DC2626]';
            bgClass = 'bg-[#190C0C]';
            icon = <AlertOctagon className="w-5 h-5 text-[#DC2626] shrink-0" />;
          } else if (t.type === 'warning') {
            borderClass = 'border-l-4 border-l-[#D97706]';
            bgClass = 'bg-[#1A140B]';
            icon = <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0" />;
          } else if (t.type === 'info') {
            borderClass = 'border-l-4 border-l-[#2563EB]';
            bgClass = 'bg-[#0C121F]';
            icon = <Info className="w-5 h-5 text-[#2563EB] shrink-0" />;
          }

          return (
            <div
              key={t.id}
              className={`toast ${borderClass} ${bgClass} border border-slate-800 text-slate-100 rounded-lg p-3 shadow-lg flex items-start gap-3 w-full animate-toast-in`}
            >
              {icon}
              <div className="flex-1 text-xs font-medium leading-relaxed font-sans">{t.message}</div>
              <button
                onClick={() => removeValue(t.id)}
                className="text-slate-400 hover:text-slate-100 transition-colors pointer-events-auto"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
