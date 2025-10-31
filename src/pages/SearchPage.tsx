import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './SearchPage.module.css';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);

  const trimmed = query.trim();
  const canSubmit = trimmed.length > 0;

  const deepLink = useMemo(() => {
    if (!submitted) {
      return null;
    }
    return `/reaction/${encodeURIComponent(submitted)}`;
  }, [submitted]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSubmit) {
      setSubmitted(trimmed);
    }
  };

  return (
    <main className={styles.screen}>
      <section className={styles.card} data-card>
        <h1>Reaction explorer</h1>
        <p data-muted>Search for a reaction by its identifier to view structured conditions, components and outcomes.</p>
        <form className={styles.form} onSubmit={handleSubmit} aria-label="reaction search">
          <label htmlFor="reaction-search" className={styles.label}>
            Reaction identifier
          </label>
          <input
            id="reaction-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. RXN-001234"
            className={styles.input}
            autoComplete="off"
          />
          <button type="submit" className={styles.submit} disabled={!canSubmit}>
            View details
          </button>
        </form>
        {deepLink ? (
          <div className={styles.results} aria-live="polite">
            <h2>Search results</h2>
            <p data-muted>Navigate directly to the detailed view for the reaction you searched.</p>
            <Link to={deepLink} className={styles.resultLink} data-testid="reaction-deep-link">
              Open reaction {submitted}
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
};

export default SearchPage;
