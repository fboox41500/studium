import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BackgroundQueryStatusResponse,
  BackgroundQuerySubmissionRequest,
  BackgroundQuerySubmissionResponse,
  OrdApiClient,
} from '../api';
import { OrdApiError } from '../api';
import { stableStringify } from '../utils/serialization';

export interface UseBackgroundReactionQueryOptions {
  enabled?: boolean;
  autoSubmit?: boolean;
  pollIntervalMs?: number;
  maxPollIntervalMs?: number;
  /** When true, polling begins immediately after a successful submission (default: true). */
  startPollingAfterSubmit?: boolean;
}

const TERMINAL_STATUSES = new Set(['success', 'error', 'cancelled']);

function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DOMException) return error.name === 'AbortError';
  return typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError';
}

export interface UseBackgroundReactionQueryResult {
  job: BackgroundQuerySubmissionResponse | null;
  status: BackgroundQueryStatusResponse | null;
  error: OrdApiError | null;
  loading: boolean;
  isSubmitting: boolean;
  isPolling: boolean;
  submit: (payload?: BackgroundQuerySubmissionRequest) => Promise<BackgroundQuerySubmissionResponse | undefined>;
  poll: (jobId?: string) => Promise<BackgroundQueryStatusResponse | undefined>;
  cancelPolling: () => void;
  cancelJob: (jobId?: string) => Promise<boolean>;
  reset: () => void;
}

export function useBackgroundReactionQuery(
  client: OrdApiClient,
  request: BackgroundQuerySubmissionRequest | null,
  options: UseBackgroundReactionQueryOptions = {},
): UseBackgroundReactionQueryResult {
  const {
    enabled = true,
    autoSubmit = false,
    pollIntervalMs = 5000,
    maxPollIntervalMs = 30000,
    startPollingAfterSubmit = true,
  } = options;

  const [job, setJob] = useState<BackgroundQuerySubmissionResponse | null>(null);
  const [status, setStatus] = useState<BackgroundQueryStatusResponse | null>(null);
  const [error, setError] = useState<OrdApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [loading, setLoading] = useState(false);

  const submitControllerRef = useRef<AbortController | null>(null);
  const pollControllerRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<UseBackgroundReactionQueryResult['poll']>(() => Promise.resolve(undefined));
  const mountedRef = useRef(true);

  const requestKey = useMemo(() => stableStringify(request ?? {}), [request]);

  useEffect(() => () => {
    mountedRef.current = false;
    submitControllerRef.current?.abort();
    pollControllerRef.current?.abort();
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const clearPollTimeout = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const cancelPolling = useCallback(() => {
    clearPollTimeout();
    pollControllerRef.current?.abort();
    pollControllerRef.current = null;
    if (mountedRef.current) {
      setIsPolling(false);
    }
  }, [clearPollTimeout]);

  const scheduleNextPoll = useCallback(
    (jobId: string, response?: BackgroundQueryStatusResponse | null) => {
      if (!mountedRef.current) return;
      if (response && TERMINAL_STATUSES.has(response.status)) {
        setIsPolling(false);
        return;
      }
      const suggested = response?.pollAfterSeconds ? response.pollAfterSeconds * 1000 : pollIntervalMs;
      const delay = Math.min(maxPollIntervalMs, suggested);
      clearPollTimeout();
      pollTimeoutRef.current = setTimeout(() => {
        const pollFunction = pollRef.current;
        if (pollFunction) {
          void pollFunction(jobId);
        }
      }, delay);
    },
    [clearPollTimeout, pollIntervalMs, maxPollIntervalMs],
  );

  const poll = useCallback<UseBackgroundReactionQueryResult['poll']>(
    async (jobId = job?.jobId ?? status?.jobId ?? undefined) => {
      if (!jobId || !enabled) return undefined;

      pollControllerRef.current?.abort();
      const controller = new AbortController();
      pollControllerRef.current = controller;

      if (mountedRef.current) {
        setIsPolling(true);
        setLoading((previous) => previous || !status);
      }

      try {
        const nextStatus = await client.pollBackgroundQuery(jobId, { signal: controller.signal });
        if (!mountedRef.current) return undefined;
        setStatus(nextStatus);
        setError(null);
        if (TERMINAL_STATUSES.has(nextStatus.status)) {
          cancelPolling();
        } else {
          scheduleNextPoll(jobId, nextStatus);
        }
        return nextStatus;
      } catch (err) {
        if (isAbortError(err)) {
          return undefined;
        }
        const apiError = err as OrdApiError;
        if (mountedRef.current) {
          setError(apiError);
          cancelPolling();
          setIsPolling(false);
        }
        throw apiError;
      } finally {
        if (mountedRef.current && pollControllerRef.current === controller) {
          pollControllerRef.current = null;
          setLoading(false);
        }
      }
    },
    [cancelPolling, client, enabled, job?.jobId, scheduleNextPoll, status],
  );

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const submit = useCallback<UseBackgroundReactionQueryResult['submit']>(
    async (payload) => {
      const submission = payload ?? request ?? undefined;
      if (!submission || !enabled) {
        return undefined;
      }

      submitControllerRef.current?.abort();
      const controller = new AbortController();
      submitControllerRef.current = controller;

      if (mountedRef.current) {
        setIsSubmitting(true);
        setLoading(true);
        setError(null);
      }

      try {
        const response = await client.submitBackgroundQuery(submission, { signal: controller.signal });
        if (!mountedRef.current) return undefined;
        setJob(response);
        setStatus(null);
        setError(null);
        if (startPollingAfterSubmit && response.jobId) {
          void poll(response.jobId);
        }
        return response;
      } catch (err) {
        if (isAbortError(err)) {
          return undefined;
        }
        const apiError = err as OrdApiError;
        if (mountedRef.current) {
          setError(apiError);
          setStatus(null);
        }
        throw apiError;
      } finally {
        if (mountedRef.current && submitControllerRef.current === controller) {
          submitControllerRef.current = null;
          setIsSubmitting(false);
          setLoading(false);
        }
      }
    },
    [client, enabled, poll, request, startPollingAfterSubmit],
  );

  const cancelJob = useCallback<UseBackgroundReactionQueryResult['cancelJob']>(
    async (jobId = job?.jobId ?? status?.jobId ?? undefined) => {
      if (!jobId) return false;
      try {
        const cancelled = await client.cancelBackgroundQuery(jobId);
        if (cancelled && mountedRef.current) {
          cancelPolling();
          setStatus((previous) =>
            previous
              ? {
                  ...previous,
                  status: 'cancelled',
                }
              : previous,
          );
        }
        return cancelled;
      } catch (err) {
        if (isAbortError(err)) {
          return false;
        }
        const apiError = err as OrdApiError;
        if (mountedRef.current) {
          setError(apiError);
        }
        throw apiError;
      }
    },
    [cancelPolling, client, job?.jobId, status?.jobId],
  );

  const reset = useCallback(() => {
    submitControllerRef.current?.abort();
    cancelPolling();
    if (mountedRef.current) {
      setJob(null);
      setStatus(null);
      setError(null);
      setIsSubmitting(false);
      setIsPolling(false);
      setLoading(false);
    }
  }, [cancelPolling]);

  useEffect(() => {
    if (!enabled || !autoSubmit || !request) return;
    submit(request).catch(() => undefined);
  }, [enabled, autoSubmit, submit, requestKey, request]);

  return {
    job,
    status,
    error,
    loading,
    isSubmitting,
    isPolling,
    submit,
    poll,
    cancelPolling,
    cancelJob,
    reset,
  };
}
