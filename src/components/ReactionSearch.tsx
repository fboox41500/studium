import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Reaction,
  ReactionSearchClient,
  ReactionSearchFilters,
  ReactionSearchResponse
} from '../api/reactionSearchClient';
import { ReactionSearchForm } from './ReactionSearchForm';
import { ReactionResults } from './ReactionResults';
import { ReactionDetailPanel } from './ReactionDetailPanel';

export interface ReactionSearchProps {
  client: ReactionSearchClient;
  pageSize?: number;
}

type AsyncStatus = 'idle' | 'loading' | 'error' | 'success';

const createDefaultFilters = (): ReactionSearchFilters => ({
  query: '',
  catalyst: '',
  reagent: '',
  includeIntermediates: false,
  temperatureMin: undefined,
  temperatureMax: undefined,
  tags: []
});

const normalizeFilters = (filters: ReactionSearchFilters): ReactionSearchFilters => ({
  query: filters.query.trim(),
  catalyst: filters.catalyst.trim(),
  reagent: filters.reagent.trim(),
  includeIntermediates: filters.includeIntermediates,
  temperatureMin: filters.temperatureMin,
  temperatureMax: filters.temperatureMax,
  tags: filters.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
});

export const ReactionSearch = ({ client, pageSize = 10 }: ReactionSearchProps) => {
  const defaultFilters = useMemo(() => createDefaultFilters(), []);

  const [filters, setFilters] = useState<ReactionSearchFilters>(createDefaultFilters);
  const [submittedFilters, setSubmittedFilters] = useState<ReactionSearchFilters>(createDefaultFilters);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReactionSearchResponse | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(null);

  useEffect(() => {
    let isActive = true;
    setStatus('loading');
    setError(null);

    client
      .search({ filters: submittedFilters, pagination: { page, pageSize } })
      .then((response) => {
        if (!isActive) {
          return;
        }
        setResult(response);
        setSelectedReaction(response.reactions[0] ?? null);
        setStatus('success');
      })
      .catch((reason) => {
        if (!isActive) {
          return;
        }
        setStatus('error');
        const message = reason instanceof Error ? reason.message : 'Unknown error';
        setError(message);
        setSelectedReaction(null);
      });

    return () => {
      isActive = false;
    };
  }, [client, page, pageSize, submittedFilters]);

  const handleFiltersChange = useCallback((next: ReactionSearchFilters) => {
    setFilters({ ...next, tags: [...next.tags] });
  }, []);

  const handleSubmit = useCallback(
    (next: ReactionSearchFilters) => {
      const normalized = normalizeFilters(next);
      setFilters(normalized);
      setSubmittedFilters({ ...normalized, tags: [...normalized.tags] });
      setPage(1);
    },
    []
  );

  const handleReset = useCallback(
    (resetTo: ReactionSearchFilters) => {
      const normalized = normalizeFilters(resetTo);
      setFilters(normalized);
      setSubmittedFilters({ ...normalized, tags: [...normalized.tags] });
      setPage(1);
    },
    []
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (nextPage < 1) {
        return;
      }
      const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : nextPage;
      if (nextPage > totalPages) {
        return;
      }
      setPage(nextPage);
    },
    [result]
  );

  const handleSelectReaction = useCallback((reaction: Reaction) => {
    setSelectedReaction(reaction);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedReaction(null);
  }, []);

  const reactions = result?.reactions ?? [];
  const total = result?.total ?? 0;

  return (
    <div>
      <ReactionSearchForm
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onSubmit={handleSubmit}
        onReset={handleReset}
        defaultFilters={defaultFilters}
      />

      <section aria-label="Reaction results">
        <ReactionResults
          status={status}
          error={error}
          reactions={reactions}
          total={total}
          page={page}
          pageSize={result?.pageSize ?? pageSize}
          onSelect={handleSelectReaction}
          selectedReactionId={selectedReaction?.id ?? null}
          onPageChange={handlePageChange}
        />
      </section>

      <ReactionDetailPanel reaction={selectedReaction} onClose={handleCloseDetails} />
    </div>
  );
};
