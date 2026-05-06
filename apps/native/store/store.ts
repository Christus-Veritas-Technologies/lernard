import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  setToken: (token: string | null) => void;
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setTokens: (tokens: { accessToken: string | null; refreshToken: string | null }) => void;
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
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
      logout: () =>
        set({ accessToken: null, refreshToken: null, isAuthenticated: false, onboardingComplete: false }),
    }),
    {
      name: 'lernard-auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        onboardingComplete: state.onboardingComplete,
      }),
    },
  ),
);

function hasSession(accessToken: string | null, refreshToken: string | null) {
  return Boolean(accessToken || refreshToken);
}
