import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchReactionDetails, ReactionDetail, ReactionRequestError } from '../services/reactions';

interface UseReactionDetailsState {
  data: ReactionDetail[] | null;
  loading: boolean;
  error: ReactionRequestError | null;
  ids: string[];
}

export const useReactionDetails = (primaryId?: string, queryIds: string[] = []) => {
  const ids = useMemo(() => {
    const merged = [primaryId, ...queryIds].filter((value): value is string => Boolean(value && value.trim()));
    const unique = Array.from(new Set(merged.map((value) => value.trim())));
    return unique;
  }, [primaryId, queryIds]);

  const [state, setState] = useState<UseReactionDetailsState>({
    data: null,
    loading: false,
    error: null,
    ids
  });

  const load = useCallback(async () => {
    if (!ids.length) {
      setState({ data: null, loading: false, error: new ReactionRequestError('No reaction identifier supplied.'), ids });
      return;
    }

    setState((previous) => ({ ...previous, loading: true, error: null, ids }));

    try {
      const reactions = await fetchReactionDetails(ids);
      setState({ data: reactions, loading: false, error: null, ids });
    } catch (error) {
      const requestError =
        error instanceof ReactionRequestError
          ? error
          : new ReactionRequestError(
              error instanceof Error ? error.message : 'Unable to load reaction details.',
              undefined,
              error
            );
      setState({ data: null, loading: false, error: requestError, ids });
    }
  }, [ids]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    ids,
    reload: load
  };
};
