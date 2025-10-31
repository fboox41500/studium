import { useCallback, useMemo } from 'react';
import type { OrdApiClient, ReactionDownloadRequest } from '../api';
import { useAbortableAsync, type UseAbortableAsyncOptions } from './useAbortableAsync';
import type { AsyncHookResult } from './types';

export type DownloadResult = Blob | ArrayBuffer | Response;

export interface UseReactionDownloadOptions
  extends Omit<UseAbortableAsyncOptions<ReactionDownloadRequest, DownloadResult>, 'params' | 'deps'> {
  deps?: ReadonlyArray<unknown>;
  parseAs?: 'blob' | 'arrayBuffer' | 'response';
}

export type UseReactionDownloadResult = AsyncHookResult<DownloadResult, ReactionDownloadRequest> & {
  trigger: (request?: ReactionDownloadRequest) => Promise<DownloadResult | undefined>;
  downloadUrl: string;
};

export function useReactionDownload(
  client: OrdApiClient,
  request: ReactionDownloadRequest | null = null,
  options: UseReactionDownloadOptions = {},
): UseReactionDownloadResult {
  const fetcher = useCallback(
    (payload: ReactionDownloadRequest, signal: AbortSignal) =>
      client.downloadReactions(payload, { signal, parseAs: options.parseAs ?? 'blob' }),
    [client, options.parseAs],
  );

  const deps = useMemo(() => options.deps ?? [request], [options.deps, request]);

  const asyncResult = useAbortableAsync(fetcher, {
    params: request ?? undefined,
    deps,
    enabled: options.enabled ?? true,
    autoStart: options.autoStart ?? false,
    keepPreviousData: options.keepPreviousData ?? false,
    initialData: options.initialData ?? null,
    onSuccess: options.onSuccess,
    onError: options.onError,
  });

  const trigger = useCallback<UseReactionDownloadResult['trigger']>(
    (nextRequest) => {
      const payload = nextRequest ?? request ?? undefined;
      if (!payload) {
        return Promise.resolve(undefined);
      }
      return asyncResult.refetch(payload, { abortRunning: true });
    },
    [asyncResult, request],
  );

  return {
    ...asyncResult,
    trigger,
    downloadUrl: client.buildDownloadUrl(),
  };
}
