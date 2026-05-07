import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Role } from '@lernard/shared-types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  role: Role | null;
  networkLoadingCount: number;
  setToken: (token: string | null) => void;
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setTokens: (tokens: { accessToken: string | null; refreshToken: string | null }) => void;
  setRole: (role: Role | null) => void;
  incrementNetworkLoading: () => void;
  decrementNetworkLoading: () => void;
  setOnboardingComplete: (complete: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      onboardingComplete: false,
      role: null,
      networkLoadingCount: 0,
      setToken: (token) =>
        set((state) => ({
          accessToken: token,
          isAuthenticated: hasSession(token, state.refreshToken),
        })),
      setAccessToken: (token) =>
        set((state) => ({
          accessToken: token,
          isAuthenticated: hasSession(token, state.refreshToken),
        })),
      setRefreshToken: (token) =>
        set((state) => ({
          refreshToken: token,
          isAuthenticated: hasSession(state.accessToken, token),
        })),
      setTokens: ({ accessToken, refreshToken }) =>
        set({
          accessToken,
          refreshToken,
          isAuthenticated: hasSession(accessToken, refreshToken),
        }),
      setRole: (role) => set({ role }),
      incrementNetworkLoading: () =>
        set((state) => ({
          networkLoadingCount: state.networkLoadingCount + 1,
        })),
      decrementNetworkLoading: () =>
        set((state) => ({
          networkLoadingCount: Math.max(0, state.networkLoadingCount - 1),
        })),
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          onboardingComplete: false,
          role: null,
          networkLoadingCount: 0,
        }),
    }),
    {
      name: 'lernard-auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        onboardingComplete: state.onboardingComplete,
        role: state.role,
      }),
    },
  ),
);

function hasSession(accessToken: string | null, refreshToken: string | null) {
  return Boolean(accessToken || refreshToken);
}
