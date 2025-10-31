export interface Reaction {
  id: string;
  name: string;
  summary: string;
  temperatureC?: number;
  pressureAtm?: number;
  yieldPercent?: number;
  catalyst?: string;
  reagent?: string;
  reagents: string[];
  includeIntermediates: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReactionSearchFilters {
  query: string;
  catalyst: string;
  reagent: string;
  includeIntermediates: boolean;
  temperatureMin?: number;
  temperatureMax?: number;
  tags: string[];
}

export interface ReactionSearchPagination {
  page: number;
  pageSize: number;
}

export interface ReactionSearchQuery {
  filters: ReactionSearchFilters;
  pagination: ReactionSearchPagination;
}

export interface ReactionSearchResponse {
  reactions: Reaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReactionSearchClient {
  search(query: ReactionSearchQuery): Promise<ReactionSearchResponse>;
}

export class HttpReactionSearchClient implements ReactionSearchClient {
  constructor(private readonly baseUrl: string = '/api') {}

  async search(query: ReactionSearchQuery): Promise<ReactionSearchResponse> {
    const response = await fetch(`${this.baseUrl}/reactions/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      const message = await HttpReactionSearchClient.safeReadError(response);
      throw new Error(message || `Request failed with status ${response.status}`);
    }

    const data = (await response.json()) as ReactionSearchResponse;
    return data;
  }

  private static async safeReadError(response: Response): Promise<string | null> {
    try {
      const payload = await response.json();
      if (payload && typeof payload.message === 'string') {
        return payload.message;
      }
    } catch (error) {
      // ignore - non JSON response
    }

    try {
      return await response.text();
    } catch (error) {
      return null;
    }
  }
}
