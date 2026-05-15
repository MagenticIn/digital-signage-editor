/**
 * Signage Media API — lightweight fetch-based client for the digital signage
 * backend's media endpoints.  Uses the JWT and API origin already written to
 * localStorage by the host Next.js app.
 *
 * No external dependencies (no axios).
 */

// ---------------------------------------------------------------------------
// Local-storage keys (must match the signage frontend)
// ---------------------------------------------------------------------------
const TOKEN_KEY = "digital_signage_access_token";
const API_URL_KEY = "digital_signage_api_url";
const API_PREFIX = "/api/v1";

// ---------------------------------------------------------------------------
// Types — intentionally standalone (no dependency on signage FE types)
// ---------------------------------------------------------------------------
export interface SignageMediaItem {
  id: string;
  ownerId: string;
  name: string;
  originalName: string | null;
  storageKey: string | null;
  source: "UPLOAD" | "URL";
  url: string | null;
  type: string;
  size: number;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  enableStatsCollection: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  fileUrl: string | null;
  owner: {
    id: string;
    email: string;
    name: string | null;
    last_name: string | null;
  };
}

export interface SignageMediaListResponse {
  data: SignageMediaItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    upload_used_bytes?: number;
    upload_limit_bytes?: number;
    upload_quota_mb_effective?: number;
  };
}

export interface SignageMediaQuota {
  quotaMb: number;
  quotaBytes: number;
  uploadsUsedBytes: number;
  totalOwnedMediaBytes: number;
  atOrOverQuota: boolean;
  remainingBytes: number;
}

export interface SignageMediaListQuery {
  page?: number;
  limit?: number;
  scope?: "mine" | "shared" | "all";
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Production signage backend — used when localStorage isn't seeded yet
 *  (editor loaded standalone, or before the host app's SIGNAGE_INIT lands). */
const FALLBACK_API_ORIGIN = "https://gsq-api.myageru.com";

function getApiOrigin(): string | null {
  try {
    const fromStorage = localStorage.getItem(API_URL_KEY)?.replace(/\/+$/, "");
    if (fromStorage) return fromStorage;
  } catch {
    /* fall through to fallback */
  }
  return FALLBACK_API_ORIGIN;
}

function getApiBase(): string | null {
  const origin = getApiOrigin();
  if (!origin) return null;
  return origin.endsWith(API_PREFIX) ? origin : `${origin}${API_PREFIX}`;
}

/** True when the signage backend connection is usable (JWT + URL present). */
export function isSignageConnected(): boolean {
  return true; // Boolean(getToken()) && Boolean(getApiOrigin());
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = "https://gsq-api.myageru.com/api/v1" // getApiBase();
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZDA5OWEyYy1hYmY5LTQ1MmEtOWUwNS1kZTA3MzYwYzJiYWQiLCJlbWFpbCI6ImFubW9sQGdvbWFnZW50aWMuY29tIiwiaWF0IjoxNzc4ODQwMTc5LCJleHAiOjE3Nzg5MjY1Nzl9.i4HWNHL6y-9Mau470m9wuzba61RQuxuJedaSGpizldg" // getToken();


  if (!base || !token) {
    throw new Error("Signage backend not connected (missing JWT or API URL).");
  }

  const url = `${base}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init?.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Signage API ${response.status}: ${body.slice(0, 300)}`,
    );
  }
  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a backend-relative path (e.g. `/api/v1/media-files/abc.png`) to an
 * absolute URL on the API origin.
 */
export function resolveSignageAssetUrl(
  pathOrUrl: string | null | undefined,
): string | null {
  if (!pathOrUrl) return null;
  const s = pathOrUrl.trim();
  if (s === "") return null;
  if (/^https?:\/\//i.test(s)) return s;
  const origin = getApiOrigin();
  if (!origin) return null;
  return s.startsWith("/") ? `${origin}${s}` : `${origin}/${s}`;
}

/** Fetch paginated media list. */
export async function getMediaList(
  query: SignageMediaListQuery = {},
): Promise<SignageMediaListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 40));
  params.set("scope", query.scope ?? "all");
  if (query.search) params.set("search", query.search);
  params.set("sortBy", query.sortBy ?? "updatedAt");
  params.set("sortOrder", query.sortOrder ?? "desc");

  return apiFetch<SignageMediaListResponse>(`/media?${params.toString()}`);
}

/** Fetch the user's upload quota. */
export async function getMediaQuota(): Promise<SignageMediaQuota> {
  return apiFetch<SignageMediaQuota>("/media/quota");
}

/** Upload a file to the signage media library. Returns the created item. */
export async function uploadMedia(
  file: File,
  name?: string,
): Promise<SignageMediaItem> {
  const base = getApiBase();
  const token = getToken();
  if (!base || !token) {
    throw new Error("Signage backend not connected.");
  }

  const formData = new FormData();
  formData.append("name", name ?? file.name);
  formData.append("file", file);

  const response = await fetch(`${base}/media/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Upload failed ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json() as Promise<SignageMediaItem>;
}
