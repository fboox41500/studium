// Shared type definitions for the ORD API client.

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface PaginationParams {
  /** 1-based page index */
  page?: number;
  /** Number of items per page */
  pageSize?: number;
  /** Alternative pagination cursor. */
  cursor?: string | null;
}

export interface PaginatedResponse<TItem> {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
  pages?: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string | null;
  previousCursor?: string | null;
  /** Additional metadata returned by the backend. */
  meta?: Record<string, JsonValue>;
}

export interface ReactionIdentifier {
  id: string;
  datasetId?: string;
  version?: string;
}

export interface ReactionSummary {
  id: string;
  datasetId: string;
  title?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  score?: number;
  tags?: string[];
  identifiers?: ReactionIdentifier[];
  metadata?: Record<string, JsonValue>;
}

export interface ReactionDetail extends ReactionSummary {
  stoichiometry?: JsonValue;
  conditions?: JsonValue;
  analysis?: JsonValue;
  notes?: string;
  provenance?: JsonValue;
  rawRecord?: JsonValue;
}

export interface ReactionSearchFilters {
  [key: string]: JsonValue;
}

export interface ReactionSearchRequest extends PaginationParams {
  query?: string;
  filters?: ReactionSearchFilters;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  /**
   * Optional flag allowing the backend to prioritise accuracy or latency. The concrete
   * semantics depend on the backend implementation.
   */
  searchMode?: 'fast' | 'balanced' | 'exhaustive';
}

export interface ReactionSearchResponse extends PaginatedResponse<ReactionSummary> {}

export interface ReactionBatchRequest {
  reactionIds: string[];
  includeDetails?: boolean;
}

export interface ReactionBatchResponse {
  reactions: ReactionDetail[];
}

export interface DatasetSummary {
  id: string;
  title: string;
  description?: string;
  reactionCount?: number;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  metadata?: Record<string, JsonValue>;
}

export interface DatasetListRequest extends PaginationParams {
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface DatasetListResponse extends PaginatedResponse<DatasetSummary> {}

export interface ReactionDownloadRequest {
  reactionIds?: string[];
  datasetIds?: string[];
  search?: ReactionSearchRequest;
  /** Desired archive format, defaults to `zip`. */
  format?: 'zip' | 'jsonl' | 'csv';
}

export interface DownloadResponseMeta {
  filename?: string;
  contentType?: string;
}

export interface BackgroundQuerySubmissionRequest {
  query: ReactionSearchRequest;
  notifyEmail?: string;
  label?: string;
}

export type BackgroundQueryStatusValue =
  | 'pending'
  | 'queued'
  | 'running'
  | 'success'
  | 'error'
  | 'cancelled';

export interface BackgroundQuerySubmissionResponse {
  jobId: string;
  status: BackgroundQueryStatusValue;
  submittedAt?: string;
  message?: string;
  meta?: Record<string, JsonValue>;
}

export interface BackgroundQueryStatusResponse extends BackgroundQuerySubmissionResponse {
  progress?: number;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  resultUrl?: string;
  downloadUrl?: string;
  pollAfterSeconds?: number;
}

export interface ReactionVisualisationOptions {
  format?: 'html' | 'svg';
  theme?: 'light' | 'dark';
}

export interface ReactionVisualisationResponse {
  html: string;
  /** Optional metadata describing the underlying record. */
  meta?: Record<string, JsonValue>;
}
