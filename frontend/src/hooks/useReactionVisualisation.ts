import { useCallback, useMemo } from 'react';
import type { OrdApiClient, ReactionVisualisationOptions, ReactionVisualisationResponse } from '../api';
import { useAbortableAsync, type UseAbortableAsyncOptions } from './useAbortableAsync';
import type { AsyncHookResult } from './types';
import { stableStringify } from '../utils/serialization';

export interface ReactionVisualisationParams {
  reactionId: string;
  options?: ReactionVisualisationOptions;
}

export interface UseReactionVisualisationOptions
  extends Omit<UseAbortableAsyncOptions<ReactionVisualisationParams, ReactionVisualisationResponse>, 'params' | 'deps'> {
  deps?: ReadonlyArray<unknown>;
}

export type UseReactionVisualisationResult = AsyncHookResult<ReactionVisualisationResponse, ReactionVisualisationParams> & {
  html: string | null;
  visualisationUrl: string | null;
};

export function useReactionVisualisation(
  client: OrdApiClient,
  params: ReactionVisualisationParams | null,
  options: UseReactionVisualisationOptions = {},
): UseReactionVisualisationResult {
  const enabled = (options.enabled ?? true) && Boolean(params && params.reactionId);

  const fetcher = useCallback(
    (payload: ReactionVisualisationParams, signal: AbortSignal) =>
      client.fetchReactionVisualisation(payload.reactionId, payload.options ?? {}, { signal }),
    [client],
  );

  const paramsKey = useMemo(() => stableStringify(params ?? {}), [params]);
  const deps = useMemo(() => options.deps ?? [paramsKey], [options.deps, paramsKey]);

  const asyncResult = useAbortableAsync(fetcher, {
    params: params ?? undefined,
    deps,
    enabled,
    autoStart: options.autoStart ?? true,
    keepPreviousData: options.keepPreviousData ?? false,
    initialData: options.initialData ?? null,
    onSuccess: options.onSuccess,
    onError: options.onError,
  });

  const refetch = useCallback<UseReactionVisualisationResult['refetch']>(
    (nextParams, refetchOptions) => {
      const payload = nextParams ?? params ?? undefined;
      if (!payload || !payload.reactionId) {
        return Promise.resolve(undefined);
      }
      return asyncResult.refetch(payload, refetchOptions);
    },
    [asyncResult, params],
  );

  const html = asyncResult.data?.html ?? null;
  const visualisationUrl = params?.reactionId
    ? client.buildReactionVisualisationUrl(params.reactionId, params.options ?? {})
    : null;

  return {
    ...asyncResult,
    refetch,
    html,
    visualisationUrl,
  };
}
