/**
 * Signage Layouts API — lightweight fetch-based client for the digital signage
 * backend's layout endpoints.  Uses the same JWT and API origin as signage-media-api.ts
 * (written to localStorage by the host Next.js app or via SIGNAGE_INIT postMessage).
 */

// ---------------------------------------------------------------------------
// Local-storage keys (must match signage-media-api.ts and the signage frontend)
// ---------------------------------------------------------------------------
const TOKEN_KEY = "digital_signage_access_token";
const API_URL_KEY = "digital_signage_api_url";
const API_PREFIX = "/api/v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignageLayoutDetail {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  tags: string[];
  resolution: string;
  resolutionWidth: number | null;
  resolutionHeight: number | null;
  orientation: "LANDSCAPE" | "PORTRAIT" | "BOTH";
  status: "DRAFT" | "PUBLISHED";
  duration: number | null;
  thumbnail: string | null;
  isValid: boolean;
  /** The serialized project/canvas state. */
  layoutJson: Record<string, unknown>;
  metadata: unknown;
  publishedAt: string | null;
  loopCount: number | null;
  createdAt: string;
  updatedAt: string;
  bindings: SignageBindingItem[];
}

export interface SignageBindingItem {
  id?: string;
  bindingType: "MEDIA" | "PLAYLIST";
  mediaId: string | null;
  playlistId: string | null;
  bindingKey: string;
  sortOrder: number;
  overrides: unknown;
}

export type SignageLayoutOrientation = "LANDSCAPE" | "PORTRAIT" | "BOTH";

export interface SaveLayoutPayload {
  layoutJson?: Record<string, unknown>;
  duration?: number | null;
  resolution?: string;
  resolutionWidth?: number | null;
  resolutionHeight?: number | null;
  orientation?: SignageLayoutOrientation;
  name?: string;
  description?: string | null;
  isValid?: boolean;
  metadata?: Record<string, unknown> | null;
  thumbnail?: string | null;
}

export interface BindingPayload {
  bindingType: "MEDIA" | "PLAYLIST";
  mediaId?: string | null;
  playlistId?: string | null;
  bindingKey: string;
  sortOrder?: number;
  overrides?: unknown;
}

// ---------------------------------------------------------------------------
// Helpers (same pattern as signage-media-api.ts)
// ---------------------------------------------------------------------------

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getApiOrigin(): string | null {
  try {
    return localStorage.getItem(API_URL_KEY)?.replace(/\/+$/, "") ?? null;
  } catch {
    return null;
  }
}

function getApiBase(): string | null {
  const origin = getApiOrigin();
  if (!origin) return null;
  return origin.endsWith(API_PREFIX) ? origin : `${origin}${API_PREFIX}`;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  const token = getToken();

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
    throw new Error(`Signage API ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth bridge — called by SIGNAGE_INIT postMessage handler
// ---------------------------------------------------------------------------

/** Write auth credentials from postMessage into localStorage so apiFetch works. */
export function setSignageAuth(token: string, apiUrl: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(API_URL_KEY, apiUrl.replace(/\/+$/, ""));
  } catch {
    // localStorage blocked (e.g., private browsing with strict settings)
  }
}

/** True when both JWT and API URL are present in localStorage. */
export function isSignageLayoutsConnected(): boolean {
  return Boolean(getToken()) && Boolean(getApiOrigin());
}

// ---------------------------------------------------------------------------
// Layout CRUD
// ---------------------------------------------------------------------------

/** GET /api/v1/signage-layouts/{id} */
export async function getSignageLayout(id: string): Promise<SignageLayoutDetail> {
  return apiFetch<SignageLayoutDetail>(`/signage-layouts/${id}`);
}

/** PATCH /api/v1/signage-layouts/{id} — saves metadata and/or layout JSON. */
export async function saveSignageLayout(
  id: string,
  payload: SaveLayoutPayload,
): Promise<SignageLayoutDetail> {
  return apiFetch<SignageLayoutDetail>(`/signage-layouts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** POST /api/v1/signage-layouts/{id}/publish */
export async function publishSignageLayout(id: string): Promise<SignageLayoutDetail> {
  return apiFetch<SignageLayoutDetail>(`/signage-layouts/${id}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

// ---------------------------------------------------------------------------
// Bindings
// ---------------------------------------------------------------------------

/** POST /api/v1/signage-layouts/{id}/bindings */
export async function addSignageBinding(
  id: string,
  payload: BindingPayload,
): Promise<SignageLayoutDetail> {
  return apiFetch<SignageLayoutDetail>(`/signage-layouts/${id}/bindings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** PATCH /api/v1/signage-layouts/{id}/bindings/{bindingId} */
export async function updateSignageBinding(
  id: string,
  bindingId: string,
  payload: Partial<BindingPayload>,
): Promise<SignageLayoutDetail> {
  return apiFetch<SignageLayoutDetail>(`/signage-layouts/${id}/bindings/${bindingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/v1/signage-layouts/{id}/bindings/{bindingId} */
export async function removeSignageBinding(
  id: string,
  bindingId: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/signage-layouts/${id}/bindings/${bindingId}`, {
    method: "DELETE",
  });
}
