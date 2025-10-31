import { resolveApiBaseUrl } from './env';
import type { JsonValue } from './types';

export interface HttpClientOptions {
  baseUrl?: string;
  defaultHeaders?: HeadersInit;
  fetchImpl?: typeof fetch;
}

export interface RequestOptions<TBody = unknown> {
  method?: string;
  query?: Record<string, unknown> | URLSearchParams;
  body?: TBody;
  headers?: HeadersInit;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  /** Explicitly control how the response should be parsed. */
  parseAs?: 'json' | 'text' | 'blob' | 'arrayBuffer' | 'response';
}

export interface RequestResultMeta {
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
}

export interface RequestResult<TData> {
  data: TData;
  meta: RequestResultMeta;
}

export interface ApiErrorPayload {
  detail?: string | string[] | Record<string, JsonValue>;
  message?: string;
  type?: string;
  errors?: JsonValue;
  [key: string]: JsonValue;
}

export class OrdApiError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly url: string;
  public readonly payload: ApiErrorPayload | string | null;
  public readonly headers: Headers;

  constructor(message: string, meta: RequestResultMeta, payload: ApiErrorPayload | string | null) {
    super(message);
    this.name = 'OrdApiError';
    this.status = meta.status;
    this.statusText = meta.statusText;
    this.url = meta.url;
    this.headers = meta.headers;
    this.payload = payload;
  }
}

export function isOrdApiError(error: unknown): error is OrdApiError {
  return error instanceof OrdApiError;
}

function serialiseQueryParameter(value: unknown): string | string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => serialiseQueryParameter(item))
      .flat()
      .filter((item): item is string => typeof item === 'string');
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function appendQueryParams(url: URL, query: Record<string, unknown> | URLSearchParams) {
  if (query instanceof URLSearchParams) {
    query.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
    return;
  }

  for (const [key, rawValue] of Object.entries(query)) {
    const serialised = serialiseQueryParameter(rawValue);
    if (serialised === undefined) continue;
    if (Array.isArray(serialised)) {
      for (const value of serialised) {
        url.searchParams.append(key, value);
      }
      continue;
    }
    url.searchParams.append(key, serialised);
  }
}

function ensureFetchImpl(provided?: typeof fetch): typeof fetch {
  if (provided) return provided;
  if (typeof fetch !== 'undefined') {
    return fetch;
  }
  throw new Error('Global fetch implementation not found. Please provide `fetchImpl` in HttpClientOptions.');
}

function resolveBody(body: unknown, headers: Headers): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer || body instanceof URLSearchParams) {
    return body as BodyInit;
  }
  if (typeof body === 'string') {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'text/plain');
    }
    return body;
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return JSON.stringify(body);
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: HeadersInit;
  private readonly fetchImpl: typeof fetch;

  constructor({ baseUrl, defaultHeaders, fetchImpl }: HttpClientOptions = {}) {
    this.baseUrl = baseUrl ?? resolveApiBaseUrl();
    this.defaultHeaders = defaultHeaders ?? {};
    this.fetchImpl = ensureFetchImpl(fetchImpl);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async request<TResponse>(path: string, options: RequestOptions = {}): Promise<RequestResult<TResponse>> {
    const { method = 'GET', query, body, headers, signal, credentials, parseAs } = options;
    const url = new URL(path, this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`);

    if (query) {
      appendQueryParams(url, query);
    }

    const finalHeaders = new Headers(this.defaultHeaders);

    if (headers) {
      const customHeaders = new Headers(headers);
      customHeaders.forEach((value, key) => {
        finalHeaders.set(key, value);
      });
    }

    const resolvedBody = resolveBody(body, finalHeaders);

    const response = await this.fetchImpl(url.toString(), {
      method,
      headers: finalHeaders,
      body: resolvedBody,
      signal,
      credentials,
    });

    const meta: RequestResultMeta = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      url: response.url,
    };

    if (!response.ok) {
      let payload: ApiErrorPayload | string | null = null;
      const contentType = response.headers.get('Content-Type') ?? '';
      try {
        if (contentType.includes('application/json')) {
          payload = (await response.clone().json()) as ApiErrorPayload;
        } else {
          payload = await response.clone().text();
        }
      } catch {
        payload = null;
      }
      const message =
        (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : undefined) ??
        (payload && typeof payload === 'object' && 'detail' in payload && typeof payload.detail === 'string'
          ? payload.detail
          : undefined) ??
        `${response.status} ${response.statusText}`;
      throw new OrdApiError(message, meta, payload);
    }

    if (response.status === 204 || method === 'HEAD') {
      return { data: undefined as TResponse, meta };
    }

    const finalParseAs = parseAs ?? inferParser(response);
    const data = (await parseResponse<TResponse>(response, finalParseAs)) as TResponse;

    return { data, meta };
  }
}

function inferParser(response: Response): RequestOptions['parseAs'] {
  const contentType = response.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) return 'json';
  if (contentType.includes('text/')) return 'text';
  if (contentType.includes('application/octet-stream')) return 'blob';
  if (contentType.includes('application/zip')) return 'blob';
  if (contentType.includes('application/pdf')) return 'blob';
  return 'text';
}

async function parseResponse<T>(response: Response, parseAs: NonNullable<RequestOptions['parseAs']>): Promise<T> {
  switch (parseAs) {
    case 'json':
      return (await response.clone().json()) as T;
    case 'text':
      return (await response.clone().text()) as T;
    case 'blob':
      return (await response.clone().blob()) as T;
    case 'arrayBuffer':
      return (await response.clone().arrayBuffer()) as T;
    case 'response':
      return response as unknown as T;
    default:
      return (await response.clone().text()) as T;
  }
}
