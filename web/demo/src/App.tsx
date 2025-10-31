import { FormEvent, useEffect, useMemo, useState } from 'react';

type DatasetRecord = {
  dataset_id: string;
  name: string;
  description?: string | null;
  num_reactions: number;
};

type ReactionResource = {
  dataset_id: string;
  reaction_id: string;
  proto: string;
};

type ReactionListResponse = {
  results: ReactionResource[];
  count: number;
  limit?: number | null;
};

type ReactionIdListResponse = {
  reaction_ids: string[];
  count: number;
  limit?: number | null;
};

const API_BASE_URL = (() => {
  const value = import.meta.env.VITE_API_URL as string | undefined;
  if (value) {
    return value.replace(/\/$/, '');
  }
  return 'http://localhost:8000/api/v1';
})();

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unexpected error occurred';
}

function App() {
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [datasetsError, setDatasetsError] = useState<string | null>(null);

  const [selectedDataset, setSelectedDataset] = useState('');
  const [limit, setLimit] = useState('10');
  const [idsOnly, setIdsOnly] = useState(false);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ReactionResource[]>([]);
  const [searchIds, setSearchIds] = useState<string[]>([]);
  const [searchMeta, setSearchMeta] = useState<{ count: number; limit?: number | null } | null>(
    null
  );

  const [reactionIdInput, setReactionIdInput] = useState('');
  const [reactionDetail, setReactionDetail] = useState<ReactionResource | null>(null);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [reactionError, setReactionError] = useState<string | null>(null);

  const resolvedApiBase = useMemo(() => API_BASE_URL, []);

  useEffect(() => {
    const loadDatasets = async () => {
      setDatasetsLoading(true);
      setDatasetsError(null);
      try {
        const response = await fetch(`${resolvedApiBase}/ord/datasets`);
        if (!response.ok) {
          throw new Error(`Failed to load datasets (status ${response.status})`);
        }
        const payload: DatasetRecord[] = await response.json();
        setDatasets(payload);
        if (payload.length > 0) {
          setSelectedDataset((current) => current || payload[0].dataset_id);
        }
      } catch (error) {
        setDatasetsError(formatError(error));
      } finally {
        setDatasetsLoading(false);
      }
    };

    void loadDatasets();
  }, [resolvedApiBase]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDataset) {
      setSearchError('Select a dataset to run a search.');
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setSearchMeta(null);
    setSearchResults([]);
    setSearchIds([]);

    try {
      const params = new URLSearchParams();
      params.append('dataset_ids', selectedDataset);
      const numericLimit = Number.parseInt(limit, 10);
      if (!Number.isNaN(numericLimit) && numericLimit > 0) {
        params.append('limit', numericLimit.toString());
      }
      if (idsOnly) {
        params.append('ids_only', 'true');
      }

      const response = await fetch(`${resolvedApiBase}/ord/reactions/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Search request failed (status ${response.status})`);
      }

      const data: ReactionListResponse | ReactionIdListResponse = await response.json();
      if ('reaction_ids' in data && Array.isArray(data.reaction_ids)) {
        setSearchIds(data.reaction_ids);
        setSearchMeta({ count: data.count, limit: data.limit });
      } else if ('results' in data && Array.isArray(data.results)) {
        setSearchResults(data.results);
        setSearchMeta({ count: data.count, limit: data.limit });
      } else {
        throw new Error('Unexpected response format from the API.');
      }
    } catch (error) {
      setSearchError(formatError(error));
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchReaction = async (reactionId: string) => {
    const trimmed = reactionId.trim();
    if (!trimmed) {
      setReactionError('Provide a reaction identifier.');
      return;
    }

    setReactionLoading(true);
    setReactionError(null);
    setReactionDetail(null);
    setReactionIdInput(trimmed);

    try {
      const response = await fetch(`${resolvedApiBase}/ord/reactions/${encodeURIComponent(trimmed)}`);
      if (!response.ok) {
        throw new Error(`Unable to fetch reaction (status ${response.status})`);
      }
      const payload: ReactionResource = await response.json();
      setReactionDetail(payload);
    } catch (error) {
      setReactionError(formatError(error));
    } finally {
      setReactionLoading(false);
    }
  };

  const handleReactionLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await fetchReaction(reactionIdInput);
  };

  return (
    <div className="container">
      <header>
        <h1>Studium ORD API demo</h1>
        <p className="status-text">
          Point the FastAPI backend at your local ORD snapshot, then explore datasets and reactions in
          seconds.
        </p>
        <p className="status-text">
          API base URL:&nbsp;
          <code>{resolvedApiBase}</code>
        </p>
      </header>

      <section aria-labelledby="datasets-heading">
        <h2 id="datasets-heading">Dataset catalogue</h2>
        {datasetsLoading && <p className="status-text">Loading datasets…</p>}
        {datasetsError && <p className="error-banner">{datasetsError}</p>}
        {!datasetsLoading && !datasetsError && datasets.length === 0 && (
          <p className="empty-state">No datasets available. Ensure ord-interface is configured.</p>
        )}
        <ul className="dataset-list">
          {datasets.map((dataset) => (
            <li key={dataset.dataset_id} className="dataset-card">
              <div>
                <strong>{dataset.name}</strong>
                <small>Dataset ID: {dataset.dataset_id}</small>
              </div>
              {dataset.description && <p>{dataset.description}</p>}
              <small>{dataset.num_reactions.toLocaleString()} reactions indexed</small>
              <button
                type="button"
                className="button"
                onClick={() => setSelectedDataset(dataset.dataset_id)}
                disabled={selectedDataset === dataset.dataset_id}
              >
                {selectedDataset === dataset.dataset_id ? 'Selected' : 'Search this dataset'}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="search-heading">
        <h2 id="search-heading">Search reactions</h2>
        <form className="form-grid" onSubmit={handleSearch}>
          <div className="form-row">
            <label htmlFor="dataset">
              Dataset
              <select
                id="dataset"
                value={selectedDataset}
                onChange={(event) => setSelectedDataset(event.target.value)}
              >
                <option value="" disabled>
                  Choose a dataset
                </option>
                {datasets.map((dataset) => (
                  <option key={dataset.dataset_id} value={dataset.dataset_id}>
                    {dataset.name}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="limit">
              Result limit
              <input
                id="limit"
                type="number"
                min={1}
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
              />
            </label>
          </div>
          <div className="form-actions">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={idsOnly}
                onChange={(event) => setIdsOnly(event.target.checked)}
              />
              IDs only
            </label>
            <button type="submit" className="button" disabled={searchLoading}>
              {searchLoading ? 'Searching…' : 'Run search'}
            </button>
          </div>
        </form>
        {searchError && <p className="error-banner">{searchError}</p>}
        {searchMeta && (
          <p className="status-text">
            Returned {searchMeta.count.toLocaleString()} item{searchMeta.count === 1 ? '' : 's'}
            {typeof searchMeta.limit === 'number' && ` (limit ${searchMeta.limit})`}.
          </p>
        )}
        <div className="search-results">
          {searchResults.map((reaction) => (
            <article key={reaction.reaction_id} className="result-card">
              <header>
                <h3>{reaction.reaction_id}</h3>
                <small>Dataset: {reaction.dataset_id}</small>
              </header>
              <button type="button" className="button" onClick={() => fetchReaction(reaction.reaction_id)}>
                View reaction detail
              </button>
            </article>
          ))}
          {searchIds.map((reactionId) => (
            <article key={reactionId} className="result-card">
              <header>
                <h3>{reactionId}</h3>
                <small>Identifier result</small>
              </header>
              <button type="button" className="button" onClick={() => fetchReaction(reactionId)}>
                Fetch reaction detail
              </button>
            </article>
          ))}
          {!searchLoading && !searchError && searchResults.length === 0 && searchIds.length === 0 && (
            <p className="empty-state">Run a search to see the latest reaction results.</p>
          )}
        </div>
      </section>

      <section aria-labelledby="reaction-heading">
        <h2 id="reaction-heading">Reaction detail</h2>
        <form className="form-grid" onSubmit={handleReactionLookup}>
          <div className="form-row">
            <label htmlFor="reaction-id">
              Reaction identifier
              <input
                id="reaction-id"
                value={reactionIdInput}
                onChange={(event) => setReactionIdInput(event.target.value)}
                placeholder="ord-001234567890"
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="button" disabled={reactionLoading}>
              {reactionLoading ? 'Fetching…' : 'Retrieve reaction'}
            </button>
          </div>
        </form>
        {reactionError && <p className="error-banner">{reactionError}</p>}
        {reactionDetail && (
          <div className="result-card" aria-live="polite">
            <header>
              <h3>{reactionDetail.reaction_id}</h3>
              <small>Dataset: {reactionDetail.dataset_id}</small>
            </header>
            <p className="status-text">Raw proto payload (base64 encoded):</p>
            <pre className="tabular-data">{reactionDetail.proto}</pre>
          </div>
        )}
        {!reactionDetail && !reactionLoading && !reactionError && (
          <p className="empty-state">Select a reaction to inspect its proto payload.</p>
        )}
      </section>
    </div>
  );
}

export default App;
