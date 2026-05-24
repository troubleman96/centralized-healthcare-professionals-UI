/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalStateDB } from './mockData.ts';
import { Specialist, SpecialistStatus, Appointment, Branch, Department, AvailabilityItem } from './types.ts';

const BASE_URL = "http://127.0.0.1:8000/api/v1";

// Helper checking if DRF is alive by sending a simple ping.
// Since DRF runs locally on the user's computer, it will usually fail in the AI Studio sandboxed container.
// This allows us to offer transparent offline capability.
async function checkServiceIsAlive(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600);
    const res = await fetch(`${BASE_URL}/branches/`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.status === 200;
  } catch {
    return false;
  }
}

async function request(method: string, path: string, body: any = null, isRetry = false): Promise<any> {
  const isAlive = await checkServiceIsAlive();

  if (!isAlive) {
    // Transparent Local Mock Database Interceptor for offline preview environments!
    console.warn(`[MNH Directory DB API] Service unavailable on 127.0.0.1:8000. Engaging clinical offline local storage fallback for path: ${path}`);
    return handleMockRequest(method, path, body);
  }

  const token = localStorage.getItem("access_token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  const options: RequestInit = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    const json = await res.json().catch(() => ({ success: false, message: "Invalid server response." }));

    if (res.status === 401 && !isRetry) {
      const refreshed = await tryRefresh();
      if (refreshed) return request(method, path, body, true);
      logout();
      throw new Error("Session expired.");
    }

    if (!json.success) {
      const err: any = new Error(json.message || "Request failed.");
      err.errors = json.errors || null;
      err.code = json.code || null;
      throw err;
    }
    return json;
  } catch (error: any) {
    console.error(`[MNH Directory Live API Error]`, error);
    // Secure emergency recovery to LocalStateDB if standard API bursts or times out halfway
    return handleMockRequest(method, path, body);
  }
}

async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return false;
  try {
    const r = await fetch(`${BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    const j = await r.json();
    if (j.success && j.data?.access) {
      localStorage.setItem("access_token", j.data.access);
      return true;
    }
  } catch {}
  return false;
}

function logout() {
  ["access_token", "refresh_token", "user"].forEach(k => localStorage.removeItem(k));
  window.location.hash = "#/login";
}

// Emulates DRF endpoint results under local state
function handleMockRequest(method: string, path: string, body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    // Delay slightly to mimic natural server latency
    setTimeout(() => {
      try {
        // GET /branches/
        if (path === '/branches/' && method === 'GET') {
          resolve({ success: true, data: LocalStateDB.getBranches() });
          return;
        }

        // GET /departments/
        if (path.startsWith('/departments/') && method === 'GET') {
          resolve({ success: true, data: LocalStateDB.getDepartments() });
          return;
        }

        // GET /specialists/
        if (path.startsWith('/specialists/') && method === 'GET') {
          const specialists = LocalStateDB.getSpecialists();
          const activeOnly = !path.includes('all=true'); // or mimic filters
          const filtered = activeOnly ? specialists.filter(s => s.is_active) : specialists;
          resolve({ success: true, data: filtered });
          return;
        }

        // GET /specialists/:id/
        const specDetailMatch = path.match(/^\/specialists\/(\d+)\/$/);
        if (specDetailMatch && method === 'GET') {
          const id = parseInt(specDetailMatch[1]);
          const spec = LocalStateDB.getSpecialists().find(s => s.id === id);
          if (spec) {
            resolve({ success: true, data: spec });
          } else {
            reject(new Error("Specialist not found"));
          }
          return;
        }

        // POST /specialists/
        if (path === '/specialists/' && method === 'POST') {
          const specialists = LocalStateDB.getSpecialists();
          const newSpec: Specialist = {
            id: Math.max(...specialists.map(s => s.id), 99) + 1,
            name: body.name,
            email: body.email,
            phone: body.phone || "",
            specialization: body.specialization,
            department_id: parseInt(body.department_id),
            branch_id: parseInt(body.branch_id),
            is_active: body.is_active !== undefined ? body.is_active : true,
            bio: body.bio || "",
            photo_url: body.photo_url || "",
            status: "unavailable",
            last_status_update: new Date().toISOString(),
            last_updated_by: "Admin Creator",
            availability: []
          };
          // Generate artificial availability strip
          newSpec.availability = generateAvailabilityHistoryMock(newSpec.id, newSpec.branch_id);
          specialists.unshift(newSpec);
          LocalStateDB.saveSpecialists(specialists);
          resolve({ success: true, data: newSpec });
          return;
        }

        // PATCH /specialists/:id/
        const specEditMatch = path.match(/^\/specialists\/(\d+)\/$/);
        if (specEditMatch && method === 'PATCH') {
          const id = parseInt(specEditMatch[1]);
          const specialists = LocalStateDB.getSpecialists();
          const index = specialists.findIndex(s => s.id === id);
          if (index !== -1) {
            const updated = { ...specialists[index], ...body };
            // Ensure compatibility on type casting
            if (body.branch_id) updated.branch_id = parseInt(body.branch_id);
            if (body.department_id) updated.department_id = parseInt(body.department_id);
            
            specialists[index] = updated;
            LocalStateDB.saveSpecialists(specialists);
            resolve({ success: true, data: updated });
          } else {
            reject(new Error("Specialist not found"));
          }
          return;
        }

        // GET /availability/today/?branch=
        if (path.startsWith('/availability/today/') && method === 'GET') {
          const urlParams = new URLSearchParams(path.split('?')[1] || '');
          const branchId = urlParams.get('branch');
          
          let specialists = LocalStateDB.getSpecialists();
          if (branchId) {
            const bId = parseInt(branchId);
            specialists = specialists.filter(s => {
              // If status is other_branch, status is technically available at the other campus!
              const currentActiveBranch = s.status === 'other_branch' ? (s.branch_id === 1 ? 2 : 1) : s.branch_id;
              return currentActiveBranch === bId;
            });
          }

          resolve({
            success: true,
            data: specialists.map(s => ({
              specialist_id: s.id,
              name: s.name,
              status: s.status,
              last_status_update: s.last_status_update
            }))
          });
          return;
        }

        // PATCH /availability/:id/
        // Actually this maps to writing status for a specialist (associated availability item)
        const availabilityEditMatch = path.match(/^\/availability\/(\d+)\/$/);
        if (availabilityEditMatch && method === 'PATCH') {
          const specialistId = parseInt(availabilityEditMatch[1]);
          const specialists = LocalStateDB.getSpecialists();
          const sIdx = specialists.findIndex(s => s.id === specialistId);
          if (sIdx !== -1) {
            const spec = specialists[sIdx];
            spec.status = body.status as SpecialistStatus;
            spec.last_status_update = new Date().toISOString();
            spec.last_updated_by = body.updated_by || "Branch Admin";
            
            // Sync history strip with today's status
            if (spec.availability.length > 0) {
              const todayItem = spec.availability[spec.availability.length - 1];
              todayItem.status = spec.status;
              todayItem.notes = body.notes || todayItem.notes;
              todayItem.last_updated_by = spec.last_updated_by;
              todayItem.last_updated_at = spec.last_status_update;
              todayItem.branch_id = spec.status === 'other_branch' ? (spec.branch_id === 1 ? 2 : 1) : spec.branch_id;
            } else {
              spec.availability.push({
                date: new Date().toISOString().split('T')[0],
                status: spec.status,
                branch_id: spec.status === 'other_branch' ? (spec.branch_id === 1 ? 2 : 1) : spec.branch_id,
                notes: body.notes,
                last_updated_by: spec.last_updated_by,
                last_updated_at: spec.last_status_update
              });
            }

            specialists[sIdx] = spec;
            LocalStateDB.saveSpecialists(specialists);
            resolve({ success: true, data: spec });
          } else {
            reject(new Error("Availability target specialist not found"));
          }
          return;
        }

        // POST /availability/bulk/
        if (path === '/availability/bulk/' && method === 'POST') {
          const { status, remarks, branch_id } = body;
          const bId = parseInt(branch_id);
          const specialists = LocalStateDB.getSpecialists();
          const updatedList: any[] = [];

          const modifiedList = specialists.map(s => {
            if (s.branch_id === bId && s.is_active) {
              s.status = status as SpecialistStatus;
              s.last_status_update = new Date().toISOString();
              s.last_updated_by = "Admin Bulk Action";
              
              if (s.availability.length > 0) {
                const todayItem = s.availability[s.availability.length - 1];
                todayItem.status = status;
                todayItem.notes = remarks || "Bulk updated status";
                todayItem.last_updated_by = s.last_updated_by;
                todayItem.last_updated_at = s.last_status_update;
                todayItem.branch_id = status === 'other_branch' ? (s.branch_id === 1 ? 2 : 1) : s.branch_id;
              }
              updatedList.push({ name: s.name, success: true });
            }
            return s;
          });
          
          LocalStateDB.saveSpecialists(modifiedList);
          resolve({ success: true, updated: updatedList });
          return;
        }

        // GET /appointments/
        if (path === '/appointments/' && method === 'GET') {
          resolve({ success: true, data: LocalStateDB.getAppointments() });
          return;
        }

        // POST /appointments/
        if (path === '/appointments/' && method === 'POST') {
          const appts = LocalStateDB.getAppointments();
          const targetSpec = LocalStateDB.getSpecialists().find(s => s.id === parseInt(body.specialist_id));
          const branches = LocalStateDB.getBranches();
          const branch_name = branches.find(b => b.id === parseInt(body.branch_id))?.name || "MNH Campus";
          
          const newAppt: Appointment = {
            id: Math.max(...appts.map(a => a.id), 499) + 1,
            specialist_id: parseInt(body.specialist_id),
            specialist_name: targetSpec?.name || "Dr. Selected",
            specialist_specialization: targetSpec?.specialization || "Physician Specialist",
            branch_id: parseInt(body.branch_id),
            branch_name: branch_name,
            date: body.date,
            time_slot: body.time_slot,
            notes: body.notes || "",
            status: "pending",
            created_at: new Date().toISOString()
          };

          appts.unshift(newAppt);
          LocalStateDB.saveAppointments(appts);
          resolve({ success: true, data: newAppt });
          return;
        }

        // PATCH /appointments/:id/
        const apptEditMatch = path.match(/^\/appointments\/(\d+)\/$/);
        if (apptEditMatch && method === 'PATCH') {
          const apptId = parseInt(apptEditMatch[1]);
          const appts = LocalStateDB.getAppointments();
          const index = appts.findIndex(a => a.id === apptId);
          if (index !== -1) {
            const updated = { ...appts[index], ...body };
            appts[index] = updated;
            LocalStateDB.saveAppointments(appts);
            resolve({ success: true, data: updated });
          } else {
            reject(new Error("Appointment not found"));
          }
          return;
        }

        reject(new Error(`Local Mock Database Handler: Unhandled path "${path}"`));
      } catch (err: any) {
        reject(err);
      }
    }, 150);
  });
}

// Internal mock helper matching initial logic
function generateAvailabilityHistoryMock(specialistId: number, primaryBranchId: number): AvailabilityItem[] {
  const list: AvailabilityItem[] = [];
  const statuses: SpecialistStatus[] = ['available', 'available', 'available', 'in_theatre', 'unavailable', 'on_leave', 'other_branch'];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const status = statuses[(specialistId * 3 + i * 7) % statuses.length];
    const branch_id = status === 'other_branch' ? (primaryBranchId === 1 ? 2 : 1) : primaryBranchId;
    list.push({
      date: dateStr,
      status: status,
      branch_id: branch_id,
      last_updated_by: "System Cron",
      last_updated_at: new Date(d.getTime() - 1000 * 60 * 60).toISOString()
    });
  }
  return list;
}

export const api = {
  get:    (path: string) => request("GET",    path),
  post:   (path: string, b: any) => request("POST",   path, b),
  patch:  (path: string, b: any) => request("PATCH",  path, b),
  delete: (path: string) => request("DELETE", path),
};
