import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  userId: string | null;
  role: 'worker' | 'verifier' | 'advocate' | null;
  setSession: (
    token: string,
    refreshToken: string,
    role: 'worker' | 'verifier' | 'advocate',
    userId: string,
  ) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      userId: null,
      role: null,
      setSession: (token, refreshToken, role, userId) => set({ token, refreshToken, role, userId }),
      clearSession: () => set({ token: null, refreshToken: null, role: null, userId: null }),
    }),
    {
      name: 'fairgig-auth',
    },
  ),
);
