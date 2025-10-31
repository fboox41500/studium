import { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import ReactionDetailCard from '../components/ReactionDetailCard';
import { useReactionDetails } from '../hooks/useReactionDetails';
import styles from './ReactionDetailPage.module.css';

const useQueryIds = (search: string, fallbackId?: string) => {
  return useMemo(() => {
    const params = new URLSearchParams(search);
    const idsParam = params.get('ids');
    if (!idsParam) {
      return fallbackId ? [fallbackId] : [];
    }

    const ids = idsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    return ids.length ? ids : fallbackId ? [fallbackId] : [];
  }, [search, fallbackId]);
};

const ReactionDetailPage = () => {
  const { reactionId } = useParams<{ reactionId: string }>();
  const location = useLocation();
  const queryIds = useQueryIds(location.search, reactionId);
  const { data, loading, error, ids, reload } = useReactionDetails(reactionId, queryIds);

  return (
    <main className={styles.main}>
      <section data-card>
        <header className={styles.header}>
          <div>
            <p className={styles.breadcrumb}>
              <Link to="/search">Search</Link>
              <span aria-hidden>&nbsp;/&nbsp;</span>
              <span>{reactionId}</span>
            </p>
            <h1>Reaction detail</h1>
            <p data-muted>
              Review the curated information for the selected reaction. These details include experimental
              conditions, the components utilised and the reported outcomes.
            </p>
          </div>
          {ids.length > 1 ? (
            <div className={styles.batchInfo}>
              <span className={styles.batchLabel}>Batch lookup</span>
              <ul className={styles.batchList}>
                {ids.map((id) => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </header>

        {loading ? <p data-loading>Loading reaction details…</p> : null}

        {error ? (
          <div role="alert" data-error className={styles.error}>
            <h2>Unable to fetch reaction details</h2>
            <p>{error.message}</p>
            <button type="button" onClick={reload} className={styles.retry}>
              Retry
            </button>
          </div>
        ) : null}

        {!loading && !error && !data?.length ? (
          <p data-muted>No reaction details were found for the supplied identifier.</p>
        ) : null}

        {data?.map((reaction) => (
          <div key={reaction.id} className={styles.reactionWrapper}>
            <ReactionDetailCard reaction={reaction} />
          </div>
        ))}
      </section>
    </main>
  );
};

export default ReactionDetailPage;
