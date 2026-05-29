import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import path from "path";

// Dev-only mirror of functions/api/embed: Vite has no Pages Functions runtime,
// so /api/embed must be served by a middleware during `pnpm dev`.
function embedProxyDevPlugin(): Plugin {
  const DESKTOP_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  return {
    name: "embed-proxy-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/embed", async (req, res) => {
        try {
          const reqUrl = new URL(req.url ?? "", "http://localhost");
          const target = reqUrl.searchParams.get("url");
          if (!target) {
            res.statusCode = 400;
            res.end("Missing ?url parameter");
            return;
          }
          const parsed = new URL(target);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            res.statusCode = 400;
            res.end("Only http(s) URLs are allowed");
            return;
          }
          const upstream = await fetch(parsed.toString(), {
            headers: { "User-Agent": DESKTOP_UA, "Accept-Language": "en-US,en;q=0.9" },
            redirect: "follow",
          });
          const contentType = upstream.headers.get("Content-Type") ?? "";
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
          res.statusCode = upstream.status;
          if (contentType.includes("text/html")) {
            let html = await upstream.text();
            const baseTag = `<base href="${parsed.origin}/">`;
            html = /<head[^>]*>/i.test(html)
              ? html.replace(/<head[^>]*>/i, (m) => `${m}${baseTag}`)
              : `${baseTag}${html}`;
            res.end(html);
          } else {
            const buf = Buffer.from(await upstream.arrayBuffer());
            res.end(buf);
          }
        } catch {
          res.statusCode = 502;
          res.end("Failed to proxy embed");
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // Library build only: relative asset/worker URLs resolve next to dist/index.js (Next.js / node_modules).
  base: command === "build" ? "./" : "/",
  plugins: [
    embedProxyDevPlugin(),
    react(),
    dts({
      tsconfigPath: path.resolve(__dirname, "tsconfig.json"),
      rollupTypes: true,
      outDir: "dist",
      entryRoot: "src",
    }),
  ],
  assetsInclude: ["**/*.wasm"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@openreel/core": path.resolve(__dirname, "../../packages/core/src"),
      "@openreel/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util", "@ffmpeg/core", "@ffmpeg/core-mt"],
  },
  build: {
    target: "esnext",
    assetsInlineLimit: 100000,
    copyPublicDir: false,
    lib: {
      entry: path.resolve(__dirname, "src/embed.tsx"),
      name: "OpenReelEditor",
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      // Workspace packages @openreel/core and @openreel/ui are bundled (not listed here).
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        // Single ESM file — avoids broken dynamic import resolution in Next.js node_modules.
        inlineDynamicImports: true,
        manualChunks: undefined,
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "jsxRuntime",
        },
        assetFileNames: "style[extname]",
      },
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
}));
