import { create } from 'zustand';

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

export const useAuthStore = create<AuthState>((set) => ({
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
}));

function hasSession(accessToken: string | null, refreshToken: string | null) {
  return Boolean(accessToken || refreshToken);
}
