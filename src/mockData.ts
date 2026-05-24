/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Branch, Department, Specialist, SpecialistStatus, AvailabilityItem, Appointment, User } from './types.ts';

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 1,
    name: "MNH Upanga (Main Campus)",
    address: "Malik Road, Upanga, Dar es Salaam",
    code: "UPANGA"
  },
  {
    id: 2,
    name: "MNH Mloganzila Campus",
    address: "Kisarawe Road, Mloganzila, Dar es Salaam",
    code: "MLOGANZILA"
  }
];

export const INITIAL_DEPARTMENTS: Department[] = [
  { id: 1, name: "Cardiology & Cardiothoracic Surgery", code: "CARD", branch_ids: [1, 2] },
  { id: 2, name: "Neurosurgery & Neurology", code: "NEURO", branch_ids: [1] },
  { id: 3, name: "Pediatrics & Child Health", code: "PEDI", branch_ids: [1, 2] },
  { id: 4, name: "Emergency Medicine & Trauma", code: "EMER", branch_ids: [1, 2] },
  { id: 5, name: "Obstetrics & Gynecology (Maternity)", code: "OBS_GYN", branch_ids: [1, 2] },
  { id: 6, name: "Oncology & Radiotherapy", code: "ONCO", branch_ids: [1] }
];

// Helper to generate 14-day history dates dynamically relative to today
export function generateAvailabilityHistory(specialistId: number, primaryBranchId: number): AvailabilityItem[] {
  const list: AvailabilityItem[] = [];
  const statuses: SpecialistStatus[] = ['available', 'available', 'available', 'in_theatre', 'unavailable', 'on_leave', 'other_branch'];
  
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Choose status deterministically
    const index = (specialistId * 3 + i * 7) % statuses.length;
    const status = statuses[index];
    const branch_id = status === 'other_branch' ? (primaryBranchId === 1 ? 2 : 1) : primaryBranchId;
    
    list.push({
      date: dateStr,
      status: status,
      branch_id: branch_id,
      notes: status === 'in_theatre' ? "Major emergency procedure" : status === 'other_branch' ? "Assisting in campus specialized clinic" : undefined,
      last_updated_by: "System Cron",
      last_updated_at: new Date(d.getTime() - 1000 * 60 * 60).toISOString()
    });
  }
  return list;
}

export const INITIAL_SPECIALISTS: Specialist[] = [
  {
    id: 101,
    name: "Dr. Amina Hassan",
    email: "amina.hassan@mnh.or.tz",
    phone: "+255 712 345 678",
    specialization: "Senior Interventional Cardiologist",
    department_id: 1,
    branch_id: 1, // Upanga
    is_active: true,
    bio: "Dr. Hassan is a pioneering interventional cardiologist with over 15 years of experience treating acute coronary syndromes. She specializes in cardiac catheterization and stenting at the Jakaya Kikwete Cardiac Institute (JKCI) of MNH Upanga.",
    photo_url: "",
    status: "available",
    last_status_update: new Date(Date.now() - 1000 * 60 * 42).toISOString(), // 42m ago
    last_updated_by: "Amina Hassan (Self)",
    availability: []
  },
  {
    id: 102,
    name: "Prof. Charles Kikula",
    email: "charles.kikula@mnh.or.tz",
    phone: "+255 754 998 112",
    specialization: "Senior Consultant Neurosurgeon",
    department_id: 2,
    branch_id: 1, // Upanga only has Neurosurgery
    is_active: true,
    bio: "Professor Kikula is a leading brain and spine neurosurgeon in East Africa. He academicizes and leads complex craniotomies and microsurgical repairs for aneurysms. Patients travel from around the SADC region to see him.",
    photo_url: "",
    status: "in_theatre",
    last_status_update: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    last_updated_by: "Admin John",
    availability: []
  },
  {
    id: 103,
    name: "Dr. Neema Kimario",
    email: "neema.kimario@mnh.or.tz",
    phone: "+255 783 112 456",
    specialization: "Pediatric Hematologist & Oncologist",
    department_id: 3,
    branch_id: 2, // Mloganzila
    is_active: true,
    bio: "Dr. Kimario specializes in pediatric blood and tumor disorders. She runs the modern pediatric wing at MNH Mloganzila and leads bone marrow disease research partnerships regionally.",
    photo_url: "",
    status: "available",
    last_status_update: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    last_updated_by: "System Sync",
    availability: []
  },
  {
    id: 104,
    name: "Dr. James Mwangi",
    email: "james.mwangi@mnh.or.tz",
    phone: "+255 682 300 450",
    specialization: "Emergency Trauma Specialist",
    department_id: 4,
    branch_id: 1, // Upanga
    is_active: true,
    bio: "Dr. Mwangi coordinates the Emergency Trauma Unit at Upanga. He excels in emergency triage, disaster preparedness, critical procedures, and orthopedic acute stabilizations.",
    photo_url: "",
    status: "other_branch", // At Mloganzila today
    last_status_update: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    last_updated_by: "Mloganzila Head Office",
    availability: []
  },
  {
    id: 105,
    name: "Dr. Maria Temu",
    email: "maria.temu@mnh.or.tz",
    phone: "+255 752 445 566",
    specialization: "High-Risk Obstetrics Specialist",
    department_id: 5,
    branch_id: 2, // Mloganzila
    is_active: true,
    bio: "Dr. Temu serves as clinical head of Maternity at Mloganzila. She has successfully managed thousands of high-risk pregnancies, pre-eclampsia cases, and specialized gynecological surgeries.",
    photo_url: "",
    status: "on_leave",
    last_status_update: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    last_updated_by: "Human Resources",
    availability: []
  },
  {
    id: 106,
    name: "Dr. David Shayo",
    email: "david.shayo@mnh.or.tz",
    phone: "+255 715 889 001",
    specialization: "Radiation Oncologist",
    department_id: 6,
    branch_id: 1, // Upanga Radiation Centre
    is_active: true,
    bio: "Dr. Shayo provides high-precision radiotherapy guidance and combined chemotherapy regimens for solid tumours. He has dedicated over 8 years to developing MNH's state-of-the-art oncology ward.",
    photo_url: "",
    status: "unavailable",
    last_status_update: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    last_updated_by: "David Shayo (Self)",
    availability: []
  },
  {
    id: 107,
    name: "Dr. Frank Minja",
    email: "frank.minja@mnh.or.tz",
    phone: "+255 765 123 987",
    specialization: "Senior Pediatric Cardiologist",
    department_id: 3,
    branch_id: 1, // Upanga
    is_active: true,
    bio: "Dr. Minja is a pediatric cardiologist focusing on congenital heart diseases and pediatric cardiac interventions. He operates out of Jakaya Kikwete Cardiac Institute, making regular clinical rounds at Mloganzila.",
    photo_url: "",
    status: "other_branch", // Currently assisting at Mloganzila
    last_status_update: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    last_updated_by: "Upanga Registry",
    availability: []
  },
  {
    id: 108,
    name: "Dr. Grace Mallya",
    email: "grace.mallya@mnh.or.tz",
    phone: "+255 711 777 888",
    specialization: "Consultant Gynecologist",
    department_id: 5,
    branch_id: 1, // Upanga
    is_active: true,
    bio: "Dr. Mallya works on laparoscopic surgeries, minimally invasive fertility-enhancing therapies, and routine maternal wellness programs at the main Upanga maternity complex.",
    photo_url: "",
    status: "available",
    last_status_update: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    last_updated_by: "Grace Mallya (Self)",
    availability: []
  }
];

// Initialize dynamic 14-day history for all specialists
INITIAL_SPECIALISTS.forEach(spec => {
  spec.availability = generateAvailabilityHistory(spec.id, spec.branch_id);
  // Ensure that the last item of history matches today's live status
  if (spec.availability.length > 0) {
    const todayItem = spec.availability[spec.availability.length - 1];
    todayItem.status = spec.status;
    todayItem.branch_id = spec.status === 'other_branch' ? (spec.branch_id === 1 ? 2 : 1) : spec.branch_id;
    todayItem.last_updated_at = spec.last_status_update;
    todayItem.last_updated_by = spec.last_updated_by || "Administrator";
  }
});

// Admin accounts mapped:
// Patient user: "itslugenge96@gmail.com" / "itslugenge" -> patient
// Upanga branch admin: "upanga_admin" -> branch_admin of Upanga (branch_id=1)
// Mloganzila branch admin: "mloganzila_admin" -> branch_admin of Mloganzila (branch_id=2)
// Super Admin user: "super_admin" / "openrouter" -> super_admin
export const INITIAL_USERS: User[] = [
  {
    id: 1,
    username: "patient_user",
    email: "itslugenge96@gmail.com",
    fullName: "Lugenge Makungu",
    role: "patient"
  },
  {
    id: 2,
    username: "upanga_admin",
    email: "upanga.admin@mnh.or.tz",
    fullName: "Athanas Paul (Upanga)",
    role: "branch_admin",
    branch_id: 1
  },
  {
    id: 3,
    username: "mloganzila_admin",
    email: "mloganzila.admin@mnh.or.tz",
    fullName: "Subira Lwenge (Mloganzila)",
    role: "branch_admin",
    branch_id: 2
  },
  {
    id: 4,
    username: "super_admin",
    email: "director.general@mnh.or.tz",
    fullName: "Prof. Mohamed Janabi (DG)",
    role: "super_admin"
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 501,
    specialist_id: 101,
    specialist_name: "Dr. Amina Hassan",
    specialist_specialization: "Senior Interventional Cardiologist",
    branch_id: 1,
    branch_name: "MNH Upanga (Main Campus)",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().split('T')[0], // In 2 days
    time_slot: "09:30",
    notes: "Requires follow-up on my recent ECB report",
    status: "confirmed",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
  },
  {
    id: 502,
    specialist_id: 103,
    specialist_name: "Dr. Neema Kimario",
    specialist_specialization: "Pediatric Hematologist & Oncologist",
    branch_id: 2,
    branch_name: "MNH Mloganzila Campus",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString().split('T')[0], // In 5 days
    time_slot: "14:00",
    notes: "Initial checkup for my child",
    status: "pending",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
  }
];

// Local state storage initializer
export class LocalStateDB {
  static getSpecialists(): Specialist[] {
    const data = localStorage.getItem('mnh_specialists');
    if (!data) {
      this.saveSpecialists(INITIAL_SPECIALISTS);
      return INITIAL_SPECIALISTS;
    }
    return JSON.parse(data);
  }

  static saveSpecialists(specs: Specialist[]) {
    localStorage.setItem('mnh_specialists', JSON.stringify(specs));
  }

  static getBranches(): Branch[] {
    return INITIAL_BRANCHES;
  }

  static getDepartments(): Department[] {
    return INITIAL_DEPARTMENTS;
  }

  static getAppointments(): Appointment[] {
    const data = localStorage.getItem('mnh_appointments');
    if (!data) {
      this.saveAppointments(INITIAL_APPOINTMENTS);
      return INITIAL_APPOINTMENTS;
    }
    return JSON.parse(data);
  }

  static saveAppointments(appts: Appointment[]) {
    localStorage.setItem('mnh_appointments', JSON.stringify(appts));
  }

  static getUsers(): User[] {
    return INITIAL_USERS;
  }
}
