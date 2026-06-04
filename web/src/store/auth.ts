"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthUser {
  id: number;
  name: string;
  role: string;
  email: string;
  employee_id: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem("his_token", token);
        set({ token, user });
      },
      logout: () => {
        localStorage.removeItem("his_token");
        localStorage.removeItem("his_user");
        set({ token: null, user: null });
      },
    }),
    { name: "his_auth" }
  )
);
