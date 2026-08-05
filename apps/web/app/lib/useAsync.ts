'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from './api-client';

export type AsyncState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: T }
  | { readonly status: 'error'; readonly error: ApiError };

/**
 * Loads async data with explicit loading/ready/error states and a stable `reload`. Guards against
 * setting state after unmount so screen transitions never log React warnings.
 */
export function useAsync<T>(loader: () => Promise<T>): {
  readonly state: AsyncState<T>;
  readonly reload: () => void;
  readonly setData: (data: T) => void;
} {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setNonce((n) => n + 1);
  }, []);
  const setData = useCallback((data: T) => {
    setState({ status: 'ready', data });
  }, []);

  useEffect(() => {
    let active = true;
    loader()
      .then((data) => {
        if (active) setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const apiError =
          error instanceof ApiError ? error : new ApiError(0, 'Unexpected error loading data.');
        setState({ status: 'error', error: apiError });
      });
    return () => {
      active = false;
    };
    // `loader` is intentionally captured once per screen; `nonce` drives explicit reloads.
  }, [nonce]);

  return { state, reload, setData };
}
