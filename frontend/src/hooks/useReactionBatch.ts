import { useCallback, useMemo } from 'react';
import type { OrdApiClient, ReactionBatchRequest, ReactionBatchResponse } from '../api';
import { useAbortableAsync, type UseAbortableAsyncOptions } from './useAbortableAsync';
import type { AsyncHookResult } from './types';

export interface UseReactionBatchOptions
  extends Omit<UseAbortableAsyncOptions<ReactionBatchRequest, ReactionBatchResponse>, 'params' | 'deps'> {
  deps?: ReadonlyArray<unknown>;
}

export type UseReactionBatchResult = AsyncHookResult<ReactionBatchResponse, ReactionBatchRequest>;

export function useReactionBatch(
  client: OrdApiClient,
  request: ReactionBatchRequest | null,
  options: UseReactionBatchOptions = {},
): UseReactionBatchResult {
  const enabled = (options.enabled ?? true) && Boolean(request && request.reactionIds.length > 0);

  const fetcher = useCallback(
    (params: ReactionBatchRequest, signal: AbortSignal) => client.getReactionBatch(params, { signal }),
    [client],
  );

  const deps = useMemo(() => options.deps ?? [request?.reactionIds], [options.deps, request?.reactionIds]);

  const asyncResult = useAbortableAsync(fetcher, {
    params: request ?? undefined,
    deps,
    enabled,
    autoStart: options.autoStart,
    keepPreviousData: options.keepPreviousData,
    initialData: options.initialData ?? null,
    onSuccess: options.onSuccess,
    onError: options.onError,
  });

  const refetch = useCallback<UseReactionBatchResult['refetch']>(
    (nextRequest, refetchOptions) => {
      const payload = nextRequest ?? request ?? undefined;
      if (!payload) {
        return Promise.resolve(undefined);
      }
      return asyncResult.refetch(payload, refetchOptions);
    },
    [asyncResult, request],
  );

  return {
    ...asyncResult,
    refetch,
  };
}
