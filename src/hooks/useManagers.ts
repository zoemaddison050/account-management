import { useState, useEffect, useCallback } from 'react';
import type { AccountManager } from '../types';
import { getManagers, isApiConfigured } from '../lib/api';

export interface UseManagersResult {
  managers: AccountManager[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** True when data came from the local mock fallback rather than a live API. */
  usingFallback: boolean;
}

/**
 * React hook that fetches the approved account-manager roster from the
 * server API. Falls back to mock data during local development.
 *
 * Usage:
 *   const { managers, loading, error } = useManagers();
 */
export function useManagers(): UseManagersResult {
  const [managers, setManagers] = useState<AccountManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

  const refetch = useCallback(() => setRefetchTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getManagers()
      .then((data) => {
        if (cancelled) return;
        setManagers(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load account managers';
        setError(message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refetchTick]);

  return {
    managers,
    loading,
    error,
    refetch,
    usingFallback: !isApiConfigured,
  };
}
