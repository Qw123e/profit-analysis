import { httpDelete, httpGet, httpPost, httpPut } from "@/services/httpClient";

export interface SavedQuery {
  id: number;
  user_id: number | null;
  name: string;
  description: string | null;
  sql: string;
  database: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedQueryCreate {
  name: string;
  description?: string;
  sql: string;
  database?: string;
  is_favorite?: boolean;
}

export interface SavedQueryUpdate {
  name?: string;
  description?: string;
  sql?: string;
  database?: string;
  is_favorite?: boolean;
}

export interface SavedQueryListResponse {
  items: SavedQuery[];
}

export const savedQueryService = {
  create: async (data: SavedQueryCreate): Promise<SavedQuery> => {
    return httpPost<SavedQuery>("/v1/saved-queries", data);
  },

  list: async (favoritesOnly: boolean = false): Promise<SavedQueryListResponse> => {
    const qs = favoritesOnly ? "?favorites_only=true" : "";
    return httpGet<SavedQueryListResponse>(`/v1/saved-queries${qs}`);
  },

  get: async (queryId: number): Promise<SavedQuery> => {
    return httpGet<SavedQuery>(`/v1/saved-queries/${queryId}`);
  },

  update: async (queryId: number, data: SavedQueryUpdate): Promise<SavedQuery> => {
    return httpPut<SavedQuery>(`/v1/saved-queries/${queryId}`, data);
  },

  delete: async (queryId: number): Promise<void> => {
    await httpDelete(`/v1/saved-queries/${queryId}`);
  }
};
