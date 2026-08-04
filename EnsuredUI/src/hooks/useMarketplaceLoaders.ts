import { useCallback, useEffect, useRef } from 'react';
import { getActivePendingFunding } from '../api/marketplace';

export type ActivePendingFundingParams = { dealId?: string | number; dealName?: string | number };

export type ActivePendingFundingLoaderOptions = {
  onStart?: () => void;
  onSuccess: (data: unknown) => void;
  onError?: (error: unknown) => void;
  onFinally?: () => void;
};

/**
 * Reusable loader for the `active-pending-funding` opportunities endpoint.
 * Accepts lifecycle callbacks so callers can decide how to process the raw
 * response / errors and manage their own local state.
 */
export function useActivePendingFundingLoader({
  onStart,
  onSuccess,
  onError,
  onFinally,
}: ActivePendingFundingLoaderOptions) {
  const callbacksRef = useRef<ActivePendingFundingLoaderOptions>({
    onStart,
    onSuccess,
    onError,
    onFinally,
  });

  useEffect(() => {
    callbacksRef.current = {
      onStart,
      onSuccess,
      onError,
      onFinally,
    };
  }, [onStart, onSuccess, onError, onFinally]);

  const load = useCallback(
    async (params?: ActivePendingFundingParams) => {
      const callbacks = callbacksRef.current;
      try {
        callbacks.onStart?.();
        const res = await getActivePendingFunding(params);
        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }
        const data = await res.json();
        callbacks.onSuccess(data);
      } catch (err) {
        callbacks.onError?.(err);
      } finally {
        callbacks.onFinally?.();
      }
    },
    []
  );

  return { load };
}
