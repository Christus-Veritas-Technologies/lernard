import { useCallback, useEffect, useState } from 'react';

import type { PagePayload } from '@lernard/shared-types';

import { nativeApiFetch } from '@/lib/native-api';
import { useAuthStore } from '@/store/store';

interface UsePagePayloadResult<T> {
  data: PagePayload<T> | null;
  error: Error | null;
  isAuthenticated: boolean;
  loading: boolean;
  refetch: () => void;
}

export function usePagePayload<T>(route: string): UsePagePayloadResult<T> {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [data, setData] = useState<PagePayload<T> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(isAuthenticated);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      setData(null);
      setError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function loadPagePayload() {
      setLoading(true);
      setError(null);

      try {
        const payload = await nativeApiFetch<PagePayload<T>>(route);

        if (cancelled) {
          return;
        }

        if (payload.forcePermissionsRefresh) {
          const refreshedPayload = await nativeApiFetch<PagePayload<T>>(route);

          if (cancelled) {
            return;
          }

          setData(refreshedPayload);
          return;
        }

        setData(payload);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setData(null);
        setError(loadError instanceof Error ? loadError : new Error('Could not load this screen.'));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPagePayload();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, requestVersion, route]);

  const refetch = useCallback(() => {
    setRequestVersion((current) => current + 1);
  }, []);

  return {
    data,
    error,
    isAuthenticated,
    loading,
    refetch,
  };
}