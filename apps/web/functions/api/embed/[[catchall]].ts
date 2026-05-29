/**
 * Cloudflare Pages Function: same-origin embed proxy.
 *
 * Fetches an arbitrary public URL server-side and re-serves it from this
 * origin with the headers that block framing removed, so pages that send
 * `X-Frame-Options` / CSP `frame-ancestors` (e.g. pub.dev) can be shown
 * inside the editor's iframe.
 *
 *   GET /api/embed?url=<encoded-absolute-url>
 *
 * Why this is needed: those headers are honored by the browser only when a
 * page is loaded inside an <iframe>. The Flutter player loads URLs as a
 * top-level WebView navigation, which is not framing, so it never trips the
 * headers — hence the same sites render there but not in a browser iframe.
 *
 * Known limits: complex SPAs, OAuth/login-gated pages, and sites that hard-pin
 * their own origin in scripts may still misbehave. The snapshot render mode
 * remains the fallback for those.
 */

const UPSTREAM_TIMEOUT_MS = 20_000;
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const onRequest: PagesFunction = async (context) => {
  const requestUrl = new URL(context.request.url);
  const target = requestUrl.searchParams.get("url");

  if (!target) {
    return new Response("Missing ?url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return new Response("Only http(s) URLs are allowed", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      method: "GET",
      headers: {
        "User-Agent": DESKTOP_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    const message =
      err instanceof DOMException && err.name === "TimeoutError"
        ? "Upstream request timed out"
        : "Failed to reach upstream site";
    return new Response(message, { status: 502 });
  }

  const headers = new Headers(upstream.headers);

  // Remove framing/CSP headers. We drop CSP entirely (not just frame-ancestors):
  // once the body is re-served from our origin, the upstream CSP's `'self'` and
  // `base-uri 'self'` directives would resolve to the proxy origin and block the
  // page's real assets and our injected <base> tag.
  headers.delete("X-Frame-Options");
  headers.delete("Content-Security-Policy");
  headers.delete("Content-Security-Policy-Report-Only");
  // These break a cross-origin body we are re-serving same-origin.
  headers.delete("Content-Length");
  headers.delete("Content-Encoding");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");

  const contentType = headers.get("Content-Type") ?? "";

  // For HTML, inject a <base> so the page's relative assets/links resolve
  // against the real origin rather than /api/embed.
  if (contentType.includes("text/html")) {
    let html = await upstream.text();
    const baseTag = `<base href="${parsed.origin}/">`;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (m) => `${m}${baseTag}`);
    } else {
      html = `${baseTag}${html}`;
    }
    return new Response(html, { status: upstream.status, headers });
  }

  return new Response(upstream.body, { status: upstream.status, headers });
};
