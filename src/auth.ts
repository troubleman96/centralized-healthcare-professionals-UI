/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from './types.ts';
import { INITIAL_USERS } from './mockData.ts';

export function getCurrentUser(): User | null {
  const u = localStorage.getItem('user');
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch {
    return null;
  }
}

export function hasRole(...roles: string[]): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return roles.includes(user.role);
}

export interface RegisterPayload {
  username: string;
  email: string;
  fullName: string;
}

export const auth = {
  login: async (username: string): Promise<{ success: boolean; user: User; token: string }> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const u = username.toLowerCase().trim();
        // Match standard predefined accounts or dynamically craft one for testing convenience
        let matchedUser = INITIAL_USERS.find(
          usr => usr.username.toLowerCase() === u || usr.email.toLowerCase() === u
        );

        if (!matchedUser) {
          // Fallback login: allows user testing with any arbitrary username effortlessly
          matchedUser = {
            id: 999,
            username: username,
            email: `${username}@dummy.tz`,
            fullName: username.charAt(0).toUpperCase() + username.slice(1),
            role: username.includes('admin') ? 'super_admin' : 'patient'
          };
        }

        localStorage.setItem("user", JSON.stringify(matchedUser));
        localStorage.setItem("access_token", "mock_access_jwt_token_for_" + matchedUser.role);
        localStorage.setItem("refresh_token", "mock_refresh_jwt_token_for_" + matchedUser.role);

        resolve({
          success: true,
          user: matchedUser,
          token: "mock_access_jwt_token_for_" + matchedUser.role
        });
      }, 350);
    });
  },

  register: async (fullName: string, username: string, email: string, phone: string): Promise<User> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newUser: User = {
          id: Math.floor(Math.random() * 10000) + 1000,
          username: username.toLowerCase().trim(),
          email: email.toLowerCase().trim(),
          fullName: fullName,
          role: "patient" // Newly registered is always a patient role
        };

        // Cache registered user into predefined list for testing log-ins
        INITIAL_USERS.push(newUser);

        localStorage.setItem("user", JSON.stringify(newUser));
        localStorage.setItem("access_token", "mock_access_jwt_token_for_patient");
        localStorage.setItem("refresh_token", "mock_refresh_jwt_token_for_patient");

        resolve(newUser);
      }, 500);
    });
  },

  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.hash = "#/login";
  }
};
