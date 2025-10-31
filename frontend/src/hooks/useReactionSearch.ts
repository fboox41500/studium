import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactionSearchRequest, ReactionSearchResponse, OrdApiClient } from '../api';
import { useAbortableAsync, type UseAbortableAsyncOptions } from './useAbortableAsync';
import type { AsyncHookResult } from './types';
import { stableStringify } from '../utils/serialization';

export interface UseReactionSearchOptions
  extends Omit<UseAbortableAsyncOptions<ReactionSearchRequest, ReactionSearchResponse>, 'params' | 'deps'> {
  deps?: ReadonlyArray<unknown>;
}

export type UseReactionSearchResult = AsyncHookResult<ReactionSearchResponse, ReactionSearchRequest> & {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  updateQuery: (updater: (previous: ReactionSearchRequest) => ReactionSearchRequest) => void;
  request: ReactionSearchRequest;
};

export function useReactionSearch(
  client: OrdApiClient,
  request: ReactionSearchRequest,
  options: UseReactionSearchOptions = {},
): UseReactionSearchResult {
  const initialPage = request.page ?? 1;
  const initialPageSize = request.pageSize ?? 25;

  const [page, setPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [baseRequest, setBaseRequest] = useState<ReactionSearchRequest>(request);

  const requestKey = useMemo(() => stableStringify({ ...request, page: undefined, pageSize: undefined }), [request]);

  useEffect(() => {
    setBaseRequest({ ...request, page: undefined, pageSize: undefined });
    if (typeof request.page === 'number') {
      setPage(request.page);
    }
    if (typeof request.pageSize === 'number') {
      setPageSize(request.pageSize);
    }
  }, [requestKey, request.page, request.pageSize]);

  const effectiveRequest = useMemo<ReactionSearchRequest>(
    () => ({ ...baseRequest, page, pageSize }),
    [baseRequest, page, pageSize],
  );

  const fetcher = useCallback(
    (params: ReactionSearchRequest, signal: AbortSignal) => client.searchReactions(params, { signal }),
    [client],
  );

  const deps = useMemo(() => options.deps ?? [requestKey, page, pageSize], [options.deps, requestKey, page, pageSize]);

  const { data, error, loading, isFetching, refetch, cancel, reset } = useAbortableAsync(fetcher, {
    params: effectiveRequest,
    deps,
    enabled: options.enabled,
    autoStart: options.autoStart,
    keepPreviousData: options.keepPreviousData,
    initialData: options.initialData ?? null,
    onSuccess: options.onSuccess,
    onError: options.onError,
  });

  const refetchWithMerge = useCallback(
    async (nextRequest?: ReactionSearchRequest, refetchOptions = {}) => {
      if (nextRequest) {
        if (typeof nextRequest.page === 'number') {
          setPage(nextRequest.page);
        }
        if (typeof nextRequest.pageSize === 'number') {
          setPageSize(nextRequest.pageSize);
        }
        setBaseRequest({ ...nextRequest, page: undefined, pageSize: undefined });
        return refetch({ ...nextRequest }, refetchOptions);
      }
      return refetch(effectiveRequest, refetchOptions);
    },
    [effectiveRequest, refetch],
  );

  const updateQuery = useCallback(
    (updater: (previous: ReactionSearchRequest) => ReactionSearchRequest) => {
      const updatedBase = updater(baseRequest);
      setBaseRequest({ ...updatedBase, page: undefined, pageSize: undefined });
      const nextRequest = { ...updatedBase, page: 1, pageSize } as ReactionSearchRequest;
      setPage(1);
      refetchWithMerge(nextRequest);
    },
    [baseRequest, pageSize, refetchWithMerge],
  );

  return {
    data,
    error,
    loading,
    isFetching,
    refetch: refetchWithMerge,
    cancel,
    reset,
    page,
    pageSize,
    total: data?.total ?? 0,
    hasNextPage: data?.hasNextPage ?? Boolean(data && data.page * data.pageSize < (data.total ?? 0)),
    hasPreviousPage: data?.hasPreviousPage ?? page > 1,
    setPage,
    setPageSize,
    updateQuery,
    request: effectiveRequest,
  };
}
