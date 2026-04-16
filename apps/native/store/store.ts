import { create } from 'zustand';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  setToken: (token: string | null) => void;
  setOnboardingComplete: (complete: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  onboardingComplete: false,
  setToken: (token) => set({ token, isAuthenticated: !!token }),
  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
  logout: () => set({ token: null, isAuthenticated: false, onboardingComplete: false }),
}));
