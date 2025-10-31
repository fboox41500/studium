import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DatasetListRequest, DatasetListResponse, OrdApiClient } from '../api';
import { useAbortableAsync, type UseAbortableAsyncOptions } from './useAbortableAsync';
import type { AsyncHookResult } from './types';
import { stableStringify } from '../utils/serialization';

export interface UseDatasetsOptions
  extends Omit<UseAbortableAsyncOptions<DatasetListRequest, DatasetListResponse>, 'params' | 'deps'> {
  deps?: ReadonlyArray<unknown>;
}

export type UseDatasetsResult = AsyncHookResult<DatasetListResponse, DatasetListRequest> & {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  updateQuery: (updater: (previous: DatasetListRequest) => DatasetListRequest) => void;
  request: DatasetListRequest;
};

export function useDatasets(
  client: OrdApiClient,
  request: DatasetListRequest = {},
  options: UseDatasetsOptions = {},
): UseDatasetsResult {
  const initialPage = request.page ?? 1;
  const initialPageSize = request.pageSize ?? 25;

  const [page, setPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [baseRequest, setBaseRequest] = useState<DatasetListRequest>(request);

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

  const effectiveRequest = useMemo<DatasetListRequest>(
    () => ({ ...baseRequest, page, pageSize }),
    [baseRequest, page, pageSize],
  );

  const fetcher = useCallback(
    (params: DatasetListRequest, signal: AbortSignal) => client.listDatasets(params, { signal }),
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
    async (nextRequest?: DatasetListRequest, refetchOptions = {}) => {
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
    (updater: (previous: DatasetListRequest) => DatasetListRequest) => {
      const updatedBase = updater(baseRequest);
      setBaseRequest({ ...updatedBase, page: undefined, pageSize: undefined });
      const nextRequest = { ...updatedBase, page: 1, pageSize } as DatasetListRequest;
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
