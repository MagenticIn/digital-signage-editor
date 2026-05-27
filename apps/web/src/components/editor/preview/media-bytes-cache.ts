// Shared remote-media byte cache for the editor preview.
//
// Why this exists: three pre-decode loops in Preview.tsx each used to call
// `fetch(mediaItem.originalUrl)` directly when a media item had no in-RAM
// Blob — and a project with 10+ library-only videos triggered 10+ parallel
// fetches against `/media-files/:storageKey`. That hammered the backend
// (429 throttling), saturated the network, and stalled the preview. Worse,
// each loop re-fetched independently, so the same URL was downloaded
// multiple times per playback.
//
// This module centralises those fetches with three properties:
//   1. **In-flight dedup**  — two concurrent callers for the same URL share
//      one HTTP request, not two.
//   2. **LRU result cache**  — once an ArrayBuffer / ImageBitmap has been
//      produced, subsequent callers get it free. Bounded by a byte budget
//      so a project with hundreds of clips can't OOM the tab.
//   3. **Concurrency cap**  — at most `MAX_CONCURRENT` HTTP requests are
//      in flight at any time. Anything past that is queued. This matches
//      what a well-behaved CDN client looks like and stops the backend
//      throttler from ever firing.
//
// The cache is module-scoped (single instance per editor session). Callers
// should treat results as live — do NOT mutate the returned ArrayBuffer or
// ImageBitmap. To invalidate, call `evict(url)`.

const MAX_CONCURRENT = 2;
const MAX_BYTES_BUDGET = 250 * 1024 * 1024; // ~250 MB across all cached entries

interface CacheEntry {
  url: string;
  bytes: number;
  arrayBuffer?: ArrayBuffer;
  bitmap?: ImageBitmap;
}

const arrayBufferEntries = new Map<string, CacheEntry>();
const bitmapEntries = new Map<string, CacheEntry>();

// In-flight Promise dedup: if a fetch for `url` is already running, every
// caller awaits the same Promise rather than starting another request.
const inFlightArrayBuffer = new Map<string, Promise<ArrayBuffer>>();
const inFlightBitmap = new Map<string, Promise<ImageBitmap>>();

let activeRequests = 0;
const waitingQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests += 1;
    return;
  }
  await new Promise<void>((resolve) => waitingQueue.push(resolve));
  activeRequests += 1;
}

function releaseSlot(): void {
  activeRequests -= 1;
  const next = waitingQueue.shift();
  if (next) next();
}

function totalBytes(map: Map<string, CacheEntry>): number {
  let sum = 0;
  for (const e of map.values()) sum += e.bytes;
  return sum;
}

function evictUntilUnder(map: Map<string, CacheEntry>, budget: number): void {
  // Map iteration order is insertion order; deleting and re-inserting moves
  // an entry to "most recently used" position. We evict from the front
  // (oldest) until we're under budget.
  for (const key of map.keys()) {
    if (totalBytes(map) <= budget) return;
    const entry = map.get(key);
    if (entry?.bitmap) {
      try {
        entry.bitmap.close();
      } catch {
        // ignore — bitmap may already be detached
      }
    }
    map.delete(key);
  }
}

function bumpLru(map: Map<string, CacheEntry>, key: string): void {
  const entry = map.get(key);
  if (!entry) return;
  map.delete(key);
  map.set(key, entry);
}

/// Returns the full bytes of the resource at `url`. Concurrent callers
/// share a single underlying fetch. The result is cached for the
/// session, subject to the LRU byte budget.
export async function getArrayBuffer(url: string): Promise<ArrayBuffer> {
  const cached = arrayBufferEntries.get(url);
  if (cached?.arrayBuffer) {
    bumpLru(arrayBufferEntries, url);
    return cached.arrayBuffer;
  }
  const inflight = inFlightArrayBuffer.get(url);
  if (inflight) return inflight;

  const promise = (async () => {
    await acquireSlot();
    try {
      const resp = await fetch(url, { mode: "cors", credentials: "omit" });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} for ${url}`);
      }
      const buf = await resp.arrayBuffer();
      arrayBufferEntries.set(url, {
        url,
        bytes: buf.byteLength,
        arrayBuffer: buf,
      });
      evictUntilUnder(arrayBufferEntries, MAX_BYTES_BUDGET);
      return buf;
    } finally {
      releaseSlot();
      inFlightArrayBuffer.delete(url);
    }
  })();

  inFlightArrayBuffer.set(url, promise);
  return promise;
}

/// Returns a decoded ImageBitmap for the image at `url`. Same dedup +
/// concurrency rules as [getArrayBuffer]. Callers must NOT close the
/// returned bitmap — the cache owns it. To free it, call [evict].
export async function getImageBitmap(url: string): Promise<ImageBitmap> {
  const cached = bitmapEntries.get(url);
  if (cached?.bitmap) {
    bumpLru(bitmapEntries, url);
    return cached.bitmap;
  }
  const inflight = inFlightBitmap.get(url);
  if (inflight) return inflight;

  const promise = (async () => {
    await acquireSlot();
    try {
      const resp = await fetch(url, { mode: "cors", credentials: "omit" });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} for ${url}`);
      }
      const blob = await resp.blob();
      const bitmap = await createImageBitmap(blob);
      // Approximate byte cost = pixels × 4 (RGBA). This is the storage
      // cost in the browser's bitmap memory; using blob.size would
      // undercount because the decoded bitmap is much larger.
      const bytes = bitmap.width * bitmap.height * 4;
      bitmapEntries.set(url, { url, bytes, bitmap });
      evictUntilUnder(bitmapEntries, MAX_BYTES_BUDGET);
      return bitmap;
    } finally {
      releaseSlot();
      inFlightBitmap.delete(url);
    }
  })();

  inFlightBitmap.set(url, promise);
  return promise;
}

/// Drops the cached entry for `url` from both caches. Use when the
/// underlying media is known to have changed.
export function evict(url: string): void {
  arrayBufferEntries.delete(url);
  const bitmapEntry = bitmapEntries.get(url);
  if (bitmapEntry?.bitmap) {
    try {
      bitmapEntry.bitmap.close();
    } catch {
      // ignore
    }
  }
  bitmapEntries.delete(url);
  inFlightArrayBuffer.delete(url);
  inFlightBitmap.delete(url);
}

/// Drops everything. Useful when switching projects.
export function clearAll(): void {
  arrayBufferEntries.clear();
  for (const entry of bitmapEntries.values()) {
    if (entry.bitmap) {
      try {
        entry.bitmap.close();
      } catch {
        // ignore
      }
    }
  }
  bitmapEntries.clear();
  inFlightArrayBuffer.clear();
  inFlightBitmap.clear();
}
