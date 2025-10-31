import type { OrdApiError } from '../api';

export interface AsyncHookState<TData> {
  data: TData | null;
  error: OrdApiError | null;
  /** True when the first request has not been completed yet. */
  loading: boolean;
  /** True whenever there is an inflight request (including refetches). */
  isFetching: boolean;
}

export interface RefetchOptions {
  /** Abort any currently running request before starting a new one. */
  abortRunning?: boolean;
}

export interface Refetchable<TData, TParams = void> {
  refetch: (params?: TParams, options?: RefetchOptions) => Promise<TData | undefined>;
}

export type AsyncHookResult<TData, TParams = void> = AsyncHookState<TData> &
  Refetchable<TData, TParams> & {
    cancel: () => void;
    reset: () => void;
  };
