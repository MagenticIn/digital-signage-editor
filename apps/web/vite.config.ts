import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // Library build only: relative asset/worker URLs resolve next to dist/index.js (Next.js / node_modules).
  base: command === "build" ? "./" : "/",
  plugins: [
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
