import type { FC } from 'react';
import type { Reaction } from '../api/reactionSearchClient';
import { Spinner } from './Spinner';

export interface ReactionResultsProps {
  status: 'idle' | 'loading' | 'error' | 'success';
  error: string | null;
  reactions: Reaction[];
  total: number;
  page: number;
  pageSize: number;
  onSelect: (reaction: Reaction) => void;
  selectedReactionId: string | null;
  onPageChange: (page: number) => void;
}

export const ReactionResults: FC<ReactionResultsProps> = ({
  status,
  error,
  reactions,
  total,
  page,
  pageSize,
  onSelect,
  selectedReactionId,
  onPageChange
}) => {
  if (status === 'loading') {
    return <Spinner label="Loading reactions…" />;
  }

  if (status === 'error') {
    return (
      <div role="alert">
        <p>Unable to load reactions.</p>
        {error ? <pre>{error}</pre> : null}
      </div>
    );
  }

  if (status === 'idle') {
    return <p>Use the filters to search for reactions.</p>;
  }

  if (reactions.length === 0) {
    return <p>No reactions found. Adjust your filters and try again.</p>;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <p>
        Showing {(page - 1) * pageSize + 1} – {Math.min(page * pageSize, total)} of {total} reactions
      </p>
      <div role="list">
        {reactions.map((reaction) => (
          <button
            key={reaction.id}
            type="button"
            role="listitem"
            onClick={() => onSelect(reaction)}
            aria-pressed={selectedReactionId === reaction.id}
            style={{
              display: 'block',
              textAlign: 'left',
              border: selectedReactionId === reaction.id ? '2px solid #0066cc' : '1px solid #ccc',
              marginBottom: '0.75rem',
              padding: '0.75rem'
            }}
          >
            <h3>{reaction.name}</h3>
            <p>{reaction.summary}</p>
            <dl>
              {reaction.temperatureC !== undefined ? (
                <div>
                  <dt>Temperature</dt>
                  <dd>{reaction.temperatureC} °C</dd>
                </div>
              ) : null}
              {reaction.pressureAtm !== undefined ? (
                <div>
                  <dt>Pressure</dt>
                  <dd>{reaction.pressureAtm} atm</dd>
                </div>
              ) : null}
              {reaction.yieldPercent !== undefined ? (
                <div>
                  <dt>Yield</dt>
                  <dd>{reaction.yieldPercent}%</dd>
                </div>
              ) : null}
              {reaction.catalyst ? (
                <div>
                  <dt>Catalyst</dt>
                  <dd>{reaction.catalyst}</dd>
                </div>
              ) : null}
              {reaction.reagent ? (
                <div>
                  <dt>Reagent</dt>
                  <dd>{reaction.reagent}</dd>
                </div>
              ) : null}
              {reaction.tags.length > 0 ? (
                <div>
                  <dt>Tags</dt>
                  <dd>{reaction.tags.join(', ')}</dd>
                </div>
              ) : null}
            </dl>
          </button>
        ))}
      </div>

      <nav aria-label="Reactions navigation">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous page
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          Next page
        </button>
      </nav>
    </div>
  );
};
