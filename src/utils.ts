/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SpecialistStatus } from './types.ts';

export const getInitials = (name: string): string => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return parts
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export function getAvatarStyle(name: string): React.CSSProperties {
  if (!name) return { background: '#ccc', color: '#333' };
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  // Avoid purely random values; deterministic modulo 360
  const hue = Math.abs(h) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${hue}, 60%, 88%), hsl(${hue}, 50%, 78%))`,
    color: `hsl(${hue}, 50%, 25%)`,
    fontWeight: 700,
  };
}

export const STATUS_CONFIG = {
  available: {
    label: "Available",
    cssClass: "available",
    textColor: "text-[#065F46]",
    borderColor: "border-[#0F9B58]/30",
    bgClass: "bg-[#ECFDF5]/10",
    dotColor: "bg-[#10B981]",
    pulse: true,
    icon: "circle-check"
  },
  unavailable: {
    label: "Unavailable",
    cssClass: "unavailable",
    textColor: "text-rose-400",
    borderColor: "border-[#DC2626]/30",
    bgClass: "bg-[#FEF2F2]/10",
    dotColor: "bg-[#DC2626]",
    pulse: false,
    icon: "circle-x"
  },
  on_leave: {
    label: "On Leave",
    cssClass: "on-leave",
    textColor: "text-slate-300",
    borderColor: "border-slate-700",
    bgClass: "bg-slate-800/20",
    dotColor: "bg-slate-500",
    pulse: false,
    icon: "circle-minus"
  },
  in_theatre: {
    label: "In Theatre",
    cssClass: "in-theatre",
    textColor: "text-amber-400",
    borderColor: "border-[#D97706]/30",
    bgClass: "bg-[#FFFBEB]/10",
    dotColor: "bg-[#D97706]",
    pulse: false,
    icon: "scissors"
  },
  other_branch: {
    label: "At Other Branch",
    cssClass: "other-branch",
    textColor: "text-blue-400",
    borderColor: "border-[#2563EB]/30",
    bgClass: "bg-[#EFF6FF]/10",
    dotColor: "bg-[#2563EB]",
    pulse: false,
    icon: "map-pin"
  },
};

export function statusBadge(status: SpecialistStatus): string {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.on_leave;
  return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bgClass} ${cfg.borderColor} ${cfg.textColor}" aria-label="${cfg.label}">
    <span class="w-1.5 h-1.5 rounded-full ${cfg.dotColor} ${cfg.pulse ? 'animate-pulse-dot' : ''}" aria-hidden="true"></span>
    ${cfg.label}
  </span>`;
}

export function cardStatusClass(status: SpecialistStatus): string {
  if (status === 'available') return 'border-l-4 border-l-[#10B981]';
  if (status === 'unavailable') return 'border-l-4 border-l-[#DC2626]';
  if (status === 'on_leave') return 'border-l-4 border-l-[#9CA3AF]';
  if (status === 'in_theatre') return 'border-l-4 border-l-[#D97706]';
  if (status === 'other_branch') return 'border-l-4 border-l-[#2563EB]';
  return 'border-l-4 border-l-gray-300';
}

export function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString("en-TZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString("en-TZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString("en-TZ", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function relativeTime(isoString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 10) return "just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "recently";
  }
}

export const debounce = <F extends (...args: any[]) => any>(fn: F, delay = 350) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: Parameters<F>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

export const truncate = (str: string, maxLength = 100): string => {
  if (!str) return '';
  return str.length > maxLength ? str.slice(0, maxLength) + "…" : str;
};
