// Converts user-pasted URLs into forms that embed reliably in an iframe.
// Two cases get special handling: Google Docs (edit links → /preview) and
// YouTube (watch/share/shorts links → /embed/, which is the only YouTube
// form allowed to be framed — watch pages send X-Frame-Options).

function withProtocol(raw: string): string {
  return raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `https://${raw}`;
}

function youtubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  if (host === "youtu.be" || host.endsWith(".youtu.be")) {
    const id = path.split("/").filter(Boolean)[0];
    return id || null;
  }

  // watch?v=ID
  const v = url.searchParams.get("v");
  if (v) return v;

  // /embed/ID, /shorts/ID, /live/ID, /v/ID
  const m = path.match(/\/(?:embed|shorts|live|v)\/([^/?#]+)/);
  if (m) return m[1];

  return null;
}

function youtubeStartSeconds(url: URL): number | null {
  const raw = url.searchParams.get("start") ?? url.searchParams.get("t");
  if (!raw) return null;
  // Accept "90", "90s", or "1m30s" forms.
  const plain = Number(raw);
  if (Number.isFinite(plain) && plain > 0) return Math.floor(plain);
  const m = raw.match(/(?:(\d+)m)?(?:(\d+)s)?/);
  if (m) {
    const mins = Number(m[1] || 0);
    const secs = Number(m[2] || 0);
    const total = mins * 60 + secs;
    if (total > 0) return total;
  }
  return null;
}

const YT_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
];

/**
 * Normalize a raw URL into an embeddable URL.
 * Recognized: YouTube and Google Docs. Everything else is returned with the
 * protocol normalized but otherwise untouched.
 */
export function toEmbeddableUrl(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  const normalized = withProtocol(trimmed);

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return normalized;
  }

  const host = url.hostname.toLowerCase();

  // ---- YouTube ----------------------------------------------------------
  if (YT_HOSTS.includes(host)) {
    // Playlist → videoseries embed.
    const list = url.searchParams.get("list");
    const isPlaylistPage = url.pathname.includes("/playlist");
    const id = youtubeId(url);

    const params = new URLSearchParams({
      autoplay: "1",
      controls: "1",
      rel: "0",
      playsinline: "1",
    });

    if (isPlaylistPage && list) {
      params.set("list", list);
      return `https://www.youtube.com/embed/videoseries?${params.toString()}`;
    }

    if (id) {
      if (list) {
        // Video that is part of a playlist — let the playlist drive looping.
        params.set("list", list);
      } else {
        // Single video: loop requires playlist=<id>.
        params.set("loop", "1");
        params.set("playlist", id);
      }
      const start = youtubeStartSeconds(url);
      if (start) params.set("start", String(start));
      return `https://www.youtube.com/embed/${id}?${params.toString()}`;
    }
    // Unrecognized YouTube shape — fall through and return as-is.
    return url.toString();
  }

  // ---- Google Docs ------------------------------------------------------
  if (host.includes("docs.google.com")) {
    const path = url.pathname;
    if (path.includes("/document/") || path.includes("/presentation/")) {
      url.pathname = path.replace(/\/edit.*$/, "/preview");
      url.search = "";
      return url.toString();
    }
    if (path.includes("/spreadsheets/")) {
      url.pathname = path.replace(/\/edit.*$/, "/preview");
      return url.toString();
    }
  }

  return url.toString();
}

/**
 * True when the URL is a video-player embed (YouTube / Vimeo). Used to skip
 * the snapshot fallback — a static screenshot of a video player is useless.
 */
export function isVideoEmbedUrl(url: string): boolean {
  if (!url) return false;
  let host = "";
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    path = u.pathname.toLowerCase();
  } catch {
    return false;
  }
  if (
    (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) &&
    path.startsWith("/embed/")
  ) {
    return true;
  }
  if (host.endsWith("player.vimeo.com")) return true;
  return false;
}
