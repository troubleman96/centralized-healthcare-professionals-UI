/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SpecialistStatus = 'available' | 'unavailable' | 'on_leave' | 'in_theatre' | 'other_branch';

export interface Branch {
  id: number;
  name: string;
  address: string;
  code: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  branch_ids: number[]; // Departments can be available at specific branches
}

export interface AvailabilityItem {
  date: string; // YYYY-MM-DD
  status: SpecialistStatus;
  branch_id: number;
  notes?: string;
  last_updated_by?: string;
  last_updated_at?: string;
}

export interface Specialist {
  id: number;
  name: string;
  email: string;
  phone?: string;
  specialization: string;
  department_id: number;
  branch_id: number; // Primary branch
  is_active: boolean;
  bio?: string;
  photo_url?: string;
  status: SpecialistStatus;
  last_status_update?: string;
  last_updated_by?: string;
  availability: AvailabilityItem[]; // 14-day history
}

export interface Appointment {
  id: number;
  specialist_id: number;
  specialist_name: string;
  specialist_specialization: string;
  branch_id: number;
  branch_name: string;
  date: string; // YYYY-MM-DD
  time_slot: string; // HH:MM
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: 'patient' | 'branch_admin' | 'super_admin';
  branch_id?: number; // For branch_admin
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}
