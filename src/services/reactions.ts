export interface ReactionComponent {
  id?: string;
  name: string;
  role?: string;
  amount?: string;
  phase?: string;
  details?: string;
}

export interface ReactionOutcome {
  id?: string;
  label?: string;
  description?: string;
  yield?: string;
  selectivity?: string;
  diagramUrl?: string;
  html?: string;
}

export type ReactionVisualizationType = 'image' | 'html' | 'ketcher' | 'rdkit';

export interface ReactionVisualization {
  id?: string;
  type: ReactionVisualizationType;
  content: string;
  caption?: string;
  format?: 'mol' | 'smiles' | 'rxn';
  width?: number;
  height?: number;
  hiddenControls?: string[];
  svgOptions?: string | Record<string, unknown>;
  basePath?: string;
}

export interface ReactionDetail {
  id: string;
  title?: string;
  description?: string;
  updatedAt?: string;
  metadata?: Record<string, string | undefined>;
  conditions?: Record<string, string | undefined>;
  components?: ReactionComponent[];
  outcomes?: ReactionOutcome[];
  visualizations?: ReactionVisualization[];
}

export class ReactionRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ReactionRequestError';
  }
}

const defaultApiBase = '/api/reactions';

const normaliseBase = (base: string) => base.replace(/\/$/, '');

const parseResponse = (payload: unknown): ReactionDetail[] => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload as ReactionDetail[];
  }

  if (typeof payload === 'object') {
    const maybeObject = payload as Record<string, unknown>;

    if (Array.isArray(maybeObject.reactions)) {
      return maybeObject.reactions as ReactionDetail[];
    }

    if (Array.isArray(maybeObject.items)) {
      return maybeObject.items as ReactionDetail[];
    }

    if (maybeObject.reaction && typeof maybeObject.reaction === 'object') {
      return [maybeObject.reaction as ReactionDetail];
    }

    if (typeof maybeObject.id === 'string') {
      return [maybeObject as ReactionDetail];
    }
  }

  return [];
};

export const buildReactionUrl = (ids: string[], base = defaultApiBase) => {
  const trimmed = normaliseBase(base);
  if (ids.length === 1) {
    return `${trimmed}/${encodeURIComponent(ids[0])}`;
  }

  const query = ids.map((value) => encodeURIComponent(value)).join(',');
  const separator = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${separator}ids=${query}`;
};

export const fetchReactionDetails = async (
  ids: string[],
  options?: { fetcher?: typeof fetch; apiBase?: string }
): Promise<ReactionDetail[]> => {
  if (!ids.length) {
    throw new ReactionRequestError('At least one reaction id is required.');
  }

  const { fetcher = globalThis.fetch, apiBase = import.meta.env?.VITE_REACTIONS_API_BASE ?? defaultApiBase } = options ?? {};

  const response = await fetcher(buildReactionUrl(ids, apiBase));

  if (!response.ok) {
    throw new ReactionRequestError(`Unable to load reaction details (status ${response.status}).`, response.status);
  }

  const payload = await response.json();
  const reactions = parseResponse(payload);

  if (!reactions.length) {
    throw new ReactionRequestError('The reaction response did not include any items.', response.status);
  }

  return reactions;
};
