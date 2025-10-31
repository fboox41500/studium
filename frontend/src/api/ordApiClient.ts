import { HttpClient, OrdApiError, type HttpClientOptions, type RequestOptions } from './httpClient';
import {
  BackgroundQueryStatusResponse,
  BackgroundQuerySubmissionRequest,
  BackgroundQuerySubmissionResponse,
  DatasetListRequest,
  DatasetListResponse,
  ReactionBatchRequest,
  ReactionBatchResponse,
  ReactionDetail,
  ReactionDownloadRequest,
  ReactionSearchRequest,
  ReactionSearchResponse,
  ReactionVisualisationOptions,
  ReactionVisualisationResponse,
} from './types';

export interface OrdApiClientConfig extends HttpClientOptions {
  /** Optional path prefix. Defaults to `/ord`. */
  basePath?: string;
}

export interface DownloadReactionsOptions extends Omit<RequestOptions, 'body' | 'method' | 'parseAs'> {
  parseAs?: 'blob' | 'arrayBuffer' | 'response';
}

export interface VisualisationOptions extends Omit<RequestOptions, 'method' | 'parseAs' | 'query'> {
  reactionId: string;
  visualisation?: ReactionVisualisationOptions;
}

export class OrdApiClient {
  private readonly http: HttpClient;
  private readonly basePath: string;

  constructor(config: OrdApiClientConfig = {}) {
    this.http = new HttpClient(config);
    this.basePath = config.basePath ?? '/ord';
  }

  get baseUrl(): string {
    return this.http.getBaseUrl();
  }

  private endpoint(path: string): string {
    const withLeadingSlash = this.basePath.startsWith('/') ? this.basePath : `/${this.basePath}`;
    const prefix = withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
    if (!path) return prefix;
    if (path.startsWith('/')) {
      return `${prefix}${path}`;
    }
    return `${prefix}/${path}`;
  }

  async searchReactions(request: ReactionSearchRequest, options: RequestOptions = {}): Promise<ReactionSearchResponse> {
    const { data } = await this.http.request<ReactionSearchResponse>(this.endpoint('/reactions/search'), {
      ...options,
      method: 'POST',
      body: request,
    });
    return data;
  }

  async getReaction(id: string, options: RequestOptions = {}): Promise<ReactionDetail> {
    if (!id) {
      throw new Error('Reaction id is required');
    }
    const { data } = await this.http.request<ReactionDetail>(this.endpoint(`/reactions/${encodeURIComponent(id)}`), {
      ...options,
      method: 'GET',
    });
    return data;
  }

  async getReactionBatch(request: ReactionBatchRequest, options: RequestOptions = {}): Promise<ReactionBatchResponse> {
    if (!request || !Array.isArray(request.reactionIds) || request.reactionIds.length === 0) {
      throw new Error('At least one reaction id must be provided');
    }
    const { data } = await this.http.request<ReactionBatchResponse>(this.endpoint('/reactions/batch'), {
      ...options,
      method: 'POST',
      body: request,
    });
    return data;
  }

  async listDatasets(request: DatasetListRequest = {}, options: RequestOptions = {}): Promise<DatasetListResponse> {
    const { data } = await this.http.request<DatasetListResponse>(this.endpoint('/datasets'), {
      ...options,
      method: 'GET',
      query: request,
    });
    return data;
  }

  async downloadReactions(request: ReactionDownloadRequest, options: DownloadReactionsOptions = {}): Promise<Blob | ArrayBuffer | Response> {
    const parseAs = options.parseAs ?? 'blob';
    const { data, meta } = await this.http.request<Blob | ArrayBuffer | Response>(this.endpoint('/reactions/download'), {
      ...options,
      method: 'POST',
      body: request,
      parseAs,
    });

    if (parseAs === 'response' && !(data instanceof Response)) {
      throw new OrdApiError('Unexpected response type when parseAs is "response"', meta, null);
    }

    return data;
  }

  async submitBackgroundQuery(
    request: BackgroundQuerySubmissionRequest,
    options: RequestOptions = {},
  ): Promise<BackgroundQuerySubmissionResponse> {
    const { data } = await this.http.request<BackgroundQuerySubmissionResponse>(
      this.endpoint('/reactions/search/background'),
      {
        ...options,
        method: 'POST',
        body: request,
      },
    );
    return data;
  }

  async pollBackgroundQuery(jobId: string, options: RequestOptions = {}): Promise<BackgroundQueryStatusResponse> {
    if (!jobId) {
      throw new Error('jobId is required when polling a background query');
    }
    const { data } = await this.http.request<BackgroundQueryStatusResponse>(
      this.endpoint(`/reactions/search/background/${encodeURIComponent(jobId)}`),
      {
        ...options,
        method: 'GET',
      },
    );
    return data;
  }

  async cancelBackgroundQuery(jobId: string, options: RequestOptions = {}): Promise<boolean> {
    if (!jobId) {
      throw new Error('jobId is required when cancelling a background query');
    }
    const { meta } = await this.http.request<unknown>(
      this.endpoint(`/reactions/search/background/${encodeURIComponent(jobId)}`),
      {
        ...options,
        method: 'DELETE',
        parseAs: 'response',
      },
    );
    return meta.status >= 200 && meta.status < 300;
  }

  async fetchReactionVisualisation(
    reactionId: string,
    visualisation: ReactionVisualisationOptions = {},
    options: Omit<VisualisationOptions, 'reactionId' | 'visualisation'> = {},
  ): Promise<ReactionVisualisationResponse> {
    if (!reactionId) {
      throw new Error('reactionId is required');
    }
    const { data } = await this.http.request<string>(
      this.endpoint(`/reactions/${encodeURIComponent(reactionId)}/visualization`),
      {
        ...options,
        method: 'GET',
        query: visualisation,
        parseAs: 'text',
      },
    );
    return {
      html: data,
      meta: {
        reactionId,
        options: visualisation,
      },
    };
  }

  buildDownloadUrl(): string {
    return new URL(this.endpoint('/reactions/download'), this.http.getBaseUrl()).toString();
  }

  buildReactionVisualisationUrl(reactionId: string, visualisation: ReactionVisualisationOptions = {}): string {
    const url = new URL(this.endpoint(`/reactions/${encodeURIComponent(reactionId)}/visualization`), this.http.getBaseUrl());
    Object.entries(visualisation).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
    return url.toString();
  }
}

export function createOrdApiClient(config: OrdApiClientConfig = {}): OrdApiClient {
  return new OrdApiClient(config);
}
