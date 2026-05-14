import { create } from "zustand";
import type {
  SignageMediaItem,
  SignageMediaQuota,
  SignageMediaListQuery,
} from "../services/signage-media-api";
import {
  getMediaList,
  getMediaQuota,
  uploadMedia,
  isSignageConnected,
  resolveSignageAssetUrl,
} from "../services/signage-media-api";

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------
export interface SignageMediaState {
  /** Whether the signage backend connection is active (JWT + API URL). */
  connected: boolean;

  /** Media items fetched from backend. */
  items: SignageMediaItem[];

  /** User upload quota information. */
  quota: SignageMediaQuota | null;

  /** True while fetching the media list. */
  loading: boolean;

  /** True while uploading a file. */
  uploading: boolean;

  /** Last error message (cleared on next successful call). */
  error: string | null;

  /** Current search text. */
  search: string;

  /** Current page. */
  page: number;

  /** Total number of pages available. */
  totalPages: number;

  /** Total item count from backend. */
  totalItems: number;

  // -- Actions --

  /** Check if the signage backend is available. */
  checkConnection: () => void;

  /** Fetch media items from the backend. */
  fetchItems: (query?: Partial<SignageMediaListQuery>) => Promise<void>;

  /** Fetch the user's quota from the backend. */
  fetchQuota: () => Promise<void>;

  /** Upload a file to the signage backend. Returns the created item. */
  uploadFile: (file: File, name?: string) => Promise<SignageMediaItem>;

  /** Update the search string (will re-fetch). */
  setSearch: (search: string) => void;

  /** Go to a specific page (will re-fetch). */
  setPage: (page: number) => void;

  /** Full refresh: items + quota. */
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useSignageMediaStore = create<SignageMediaState>()((set, get) => ({
  connected: false,
  items: [],
  quota: null,
  loading: false,
  uploading: false,
  error: null,
  search: "",
  page: 1,
  totalPages: 1,
  totalItems: 0,

  checkConnection: () => {
    set({ connected: isSignageConnected() });
  },

  fetchItems: async (query = {}) => {
    const state = get();
    if (!state.connected) return;
    set({ loading: true, error: null });

    try {
      const res = await getMediaList({
        page: query.page ?? state.page,
        limit: query.limit ?? 40,
        scope: query.scope ?? "all",
        search: query.search ?? (state.search || undefined),
        sortBy: query.sortBy ?? "updatedAt",
        sortOrder: query.sortOrder ?? "desc",
      });

      set({
        items: res.data,
        page: res.meta.page,
        totalPages: Math.max(1, res.meta.total_pages),
        totalItems: res.meta.total,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load media.",
      });
    }
  },

  fetchQuota: async () => {
    const state = get();
    if (!state.connected) return;
    try {
      const quota = await getMediaQuota();
      set({ quota });
    } catch {
      // Quota is non-critical — keep going
    }
  },

  uploadFile: async (file: File, name?: string) => {
    set({ uploading: true, error: null });
    try {
      const item = await uploadMedia(file, name);
      set({ uploading: false });
      // Refresh to show the new item + updated quota
      void get().refresh();
      return item;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      set({ uploading: false, error: msg });
      throw e;
    }
  },

  setSearch: (search: string) => {
    set({ search, page: 1 });
    void get().fetchItems({ search, page: 1 });
  },

  setPage: (page: number) => {
    set({ page });
    void get().fetchItems({ page });
  },

  refresh: async () => {
    const { fetchItems, fetchQuota } = get();
    await Promise.all([fetchItems(), fetchQuota()]);
  },
}));

// Re-export for convenience
export { resolveSignageAssetUrl };
export type { SignageMediaItem, SignageMediaQuota };
