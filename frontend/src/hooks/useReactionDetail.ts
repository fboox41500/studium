import { useCallback, useMemo } from 'react';
import type { OrdApiClient, ReactionDetail } from '../api';
import { useAbortableAsync, type UseAbortableAsyncOptions } from './useAbortableAsync';
import type { AsyncHookResult } from './types';

export interface UseReactionDetailOptions
  extends Omit<UseAbortableAsyncOptions<string, ReactionDetail>, 'params' | 'deps'> {
  deps?: ReadonlyArray<unknown>;
}

export type UseReactionDetailResult = AsyncHookResult<ReactionDetail, string> & {
  reactionId?: string | null;
};

export function useReactionDetail(
  client: OrdApiClient,
  reactionId: string | null | undefined,
  options: UseReactionDetailOptions = {},
): UseReactionDetailResult {
  const enabled = (options.enabled ?? true) && Boolean(reactionId);

  const fetcher = useCallback(
    (id: string, signal: AbortSignal) => client.getReaction(id, { signal }),
    [client],
  );

  const deps = useMemo(() => options.deps ?? [reactionId], [options.deps, reactionId]);

  const asyncResult = useAbortableAsync(fetcher, {
    params: reactionId ?? undefined,
    deps,
    enabled,
    autoStart: options.autoStart,
    keepPreviousData: options.keepPreviousData,
    initialData: options.initialData ?? null,
    onSuccess: options.onSuccess,
    onError: options.onError,
  });

  const refetch = useCallback<UseReactionDetailResult['refetch']>(
    (id, refetchOptions) => {
      const targetId = id ?? reactionId ?? undefined;
      if (!targetId) {
        return Promise.resolve(undefined);
      }
      return asyncResult.refetch(targetId, refetchOptions);
    },
    [asyncResult, reactionId],
  );

  return {
    ...asyncResult,
    refetch,
    reactionId,
  };
}
