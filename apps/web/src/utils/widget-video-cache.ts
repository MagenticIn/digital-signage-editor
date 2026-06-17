import { getMediaBridge, initializeMediaBridge } from "../bridges/media-bridge";

/**
 * Cross-layout / cross-session cache for fully-downloaded widget videos, keyed
 * by source URL. A given video is downloaded once and then reused everywhere it
 * appears — across widgets, across layouts, and (via IndexedDB) across reloads.
 *
 * NOTE: localStorage can't hold large video blobs, so the persistent layer is
 * IndexedDB. An in-memory map holds the live blob URLs + frames for the session.
 */
export interface CachedVideo {
  /** Object URL for the downloaded blob — use as the <video> src. */
  blobUrl: string;
  /** Frame thumbnails (data URLs) for the timeline filmstrip. */
  frames: string[];
}

// Session caches.
const memory = new Map<string, CachedVideo>();
const inFlight = new Map<string, Promise<CachedVideo>>();

// ---------------------------------------------------------------------------
// IndexedDB (persists the raw blob + frames across reloads/layouts)
// ---------------------------------------------------------------------------
const DB_NAME = "signage-widget-video-cache";
const STORE = "videos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

interface StoredVideo {
  blob: Blob;
  frames: string[];
}

async function idbGet(url: string): Promise<StoredVideo | undefined> {
  try {
    const db = await openDb();
    return await new Promise<StoredVideo | undefined>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(url);
      req.onsuccess = () => resolve(req.result as StoredVideo | undefined);
      req.onerror = () => resolve(undefined);
    });
  } catch {
    return undefined;
  }
}

async function idbPut(url: string, value: StoredVideo): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, url);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    /* cache write is best-effort */
  }
}

// ---------------------------------------------------------------------------
// Download + frame extraction
// ---------------------------------------------------------------------------
function downloadWithProgress(
  url: string,
  onProgress: (percent: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.timeout = 10 * 60 * 1000; // 10 minutes — large videos
    xhr.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
        resolve(xhr.response as Blob);
      } else {
        reject(new Error(`Download failed (HTTP ${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Download failed (network error)."));
    xhr.ontimeout = () => reject(new Error("Download timed out."));
    xhr.send();
  });
}

async function extractFrames(blob: Blob): Promise<string[]> {
  try {
    const bridge = getMediaBridge();
    // The thumbnail generator returns [] until the media engine is initialized —
    // ensure it's ready first (matches the working media-import path).
    if (!bridge.isInitialized()) await initializeMediaBridge();
    // Pass a File (not a bare Blob), matching how the import pipeline calls it.
    const file = new File([blob], "widget-video.mp4", {
      type: blob.type || "video/mp4",
    });
    const thumbs = await bridge.generateThumbnailsForMedia(file, "video");
    return thumbs.map((t) => t.dataUrl).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Resolve a widget media file (video / audio / pdf) to a local blob URL,
 * downloading only if it isn't already cached in memory or IndexedDB.
 * Concurrent requests for the same URL share a single download. Frame
 * thumbnails are extracted only when `withFrames` is set (video).
 */
export function loadMediaForUrl(
  url: string,
  onProgress: (percent: number) => void,
  withFrames = false,
): Promise<CachedVideo> {
  const mem = memory.get(url);
  if (mem) {
    onProgress(100);
    return Promise.resolve(mem);
  }
  const flight = inFlight.get(url);
  if (flight) return flight;

  const promise = (async (): Promise<CachedVideo> => {
    // Persistent cache hit — no network.
    const stored = await idbGet(url);
    if (stored?.blob) {
      let frames = stored.frames ?? [];
      // Frames may have been stored empty (e.g. engine wasn't ready then) —
      // regenerate now and persist so future loads have them.
      if (withFrames && !frames.length) {
        frames = await extractFrames(stored.blob);
        if (frames.length) void idbPut(url, { blob: stored.blob, frames });
      }
      const cached: CachedVideo = {
        blobUrl: URL.createObjectURL(stored.blob),
        frames,
      };
      memory.set(url, cached);
      onProgress(100);
      return cached;
    }
    // Download once, then persist for reuse.
    const blob = await downloadWithProgress(url, onProgress);
    const frames = withFrames ? await extractFrames(blob) : [];
    const cached: CachedVideo = { blobUrl: URL.createObjectURL(blob), frames };
    memory.set(url, cached);
    void idbPut(url, { blob, frames });
    return cached;
  })();

  inFlight.set(url, promise);
  void promise.finally(() => inFlight.delete(url));
  return promise;
}
