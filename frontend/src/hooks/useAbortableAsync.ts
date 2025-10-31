import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OrdApiError } from '../api';
import type { AsyncHookResult, RefetchOptions } from './types';

function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  return typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError';
}

export interface UseAbortableAsyncOptions<TParams, TData> {
  params?: TParams;
  enabled?: boolean;
  autoStart?: boolean;
  deps?: ReadonlyArray<unknown>;
  keepPreviousData?: boolean;
  initialData?: TData | null;
  onSuccess?: (data: TData) => void;
  onError?: (error: OrdApiError) => void;
}

export type AsyncFetcher<TParams, TData> = (params: TParams, signal: AbortSignal) => Promise<TData>;

export function useAbortableAsync<TParams, TData>(
  fetcher: AsyncFetcher<TParams, TData>,
  options: UseAbortableAsyncOptions<TParams, TData> = {},
): AsyncHookResult<TData, TParams | undefined> {
  const {
    params,
    enabled = true,
    autoStart = true,
    deps: providedDeps,
    keepPreviousData = true,
    initialData = null,
    onSuccess,
    onError,
  } = options;

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const paramsRef = useRef<TParams | undefined>(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const deps = useMemo(() => providedDeps ?? [params], [providedDeps, params]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const dataRef = useRef<TData | null>(initialData);

  const [data, setData] = useState<TData | null>(initialData);
  const [error, setError] = useState<OrdApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(() => (autoStart && enabled && !initialData ? true : false));
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const cancel = useCallback(() => {
    const controller = abortControllerRef.current;
    if (controller) {
      controller.abort();
    }
    abortControllerRef.current = null;
  }, []);

  useEffect(() => () => {
    mountedRef.current = false;
    cancel();
  }, [cancel]);

  const reset = useCallback(() => {
    cancel();
    if (!mountedRef.current) return;
    dataRef.current = initialData;
    setData(initialData);
    setError(null);
    setLoading(false);
    setIsFetching(false);
  }, [cancel, initialData]);

  const refetch = useCallback(
    async (overrideParams?: TParams | undefined, refetchOptions: RefetchOptions = {}) => {
      const hasOverride = overrideParams !== undefined;
      const actualParams = (hasOverride ? overrideParams : paramsRef.current) as TParams;

      const { abortRunning = true } = refetchOptions;
      if (abortRunning) {
        cancel();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const hasExistingData = dataRef.current !== null;
      if (!keepPreviousData || !hasExistingData) {
        setLoading(true);
      }
      setIsFetching(true);
      setError(null);

      try {
        const result = await fetcherRef.current(actualParams, controller.signal);
        if (!mountedRef.current) {
          return undefined;
        }
        dataRef.current = result;
        setData(result);
        setError(null);
        onSuccessRef.current?.(result);
        return result;
      } catch (err) {
        if (isAbortError(err)) {
          return undefined;
        }
        const apiError = err as OrdApiError;
        if (!mountedRef.current) {
          throw apiError;
        }
        setError(apiError);
        onErrorRef.current?.(apiError);
        throw apiError;
      } finally {
        if (mountedRef.current && abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsFetching(false);
          setLoading(false);
        }
      }
    },
    [cancel, enabled, keepPreviousData],
  );

  useEffect(() => {
    if (!enabled || !autoStart) return;
    refetch(undefined, { abortRunning: true }).catch(() => undefined);
    return () => {
      cancel();
    };
  }, [enabled, autoStart, refetch, cancel, ...deps]);

  return {
    data,
    error,
    loading,
    isFetching,
    refetch,
    cancel,
    reset,
  };
}
