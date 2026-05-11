# Digital Signage Editor SDK

> **A professional, browser-based video and digital signage editor packaged as a Next.js-compatible SDK.**

This repository contains the source code for a fully-featured, client-side digital signage editor. Built with React, TypeScript, WebCodecs, and WebGPU, it allows users to edit video, add tickers, clocks, and charts entirely in the browser without server-side processing.

### Next.js integration documentation

If you are embedding the published `@openreel/web` SDK in a Next.js app, use these guides:

- **[OPENREEL_NEXTJS_INTEGRATION.md](./OPENREEL_NEXTJS_INTEGRATION.md)** — Full integration reference: install paths, COOP/COEP headers, client-only loading, CSS, assets, rebuild expectations, and troubleshooting.
- **[OPENREEL_NEXTJS_AGENT_RUNBOOK.md](./OPENREEL_NEXTJS_AGENT_RUNBOOK.md)** — Checklist for implementers or automation: ordered steps, files to touch, failure modes, and done criteria.

The section **SDK Integration Testing Guide** below is a short quick start; when anything disagrees with the two documents above, **trust the dedicated integration docs first** (they track edge cases such as header scoping and `ssr: false`).

---

## Features

- **Digital Signage Widgets**: Built-in support for clocks, tickers, countdowns, calendars, live charts, iframes, and PDFs.
- **100% Client-Side**: No video uploads required. Everything renders locally utilizing WebGPU and WebCodecs.
- **Multi-track Timeline**: Layer videos, audio, images, text, and graphics effortlessly.
- **Natively Embeddable**: Bundled as a React component SDK for seamless integration into host applications (like Next.js).

---

## SDK Integration Testing Guide

To smoke-test the SDK in a Next.js project, follow these steps. For production integration, follow [OPENREEL_NEXTJS_INTEGRATION.md](./OPENREEL_NEXTJS_INTEGRATION.md) and use [OPENREEL_NEXTJS_AGENT_RUNBOOK.md](./OPENREEL_NEXTJS_AGENT_RUNBOOK.md) as a checklist.

### 1. Installation

Install the editor directly from this GitHub repository into your Next.js project. Ensure you use the exact workspace fragment syntax.

**If using NPM:** install from a packed tarball or a published registry artifact if available; see [OPENREEL_NEXTJS_INTEGRATION.md §1](./OPENREEL_NEXTJS_INTEGRATION.md#1-install-the-sdk).

**If using PNPM (recommended for this monorepo):**
```bash
pnpm add "@openreel/web@github:augani/openreel#main:apps/web"
```
Pin the branch or tag instead of `main` for reproducible builds. Ensure `apps/web/dist` exists at the pinned revision (or build the package locally) before consuming from Git.

### 2. Next.js Security Headers (CRITICAL)

Because this editor utilizes high-performance browser features like WebAssembly and `SharedArrayBuffer` for video processing, your Next.js server **MUST** send specific security headers. If these headers are missing, the WebAssembly engine will crash.

Update your `next.config.js` (or `.mjs`) file in your testing project:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Apply headers to all routes, or specifically the route hosting the editor
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 3. Rendering the Editor Component

Since the editor relies heavily on browser-only APIs (`window`, WebGL, WebCodecs), it **cannot be rendered on the server**. You must use Next.js's dynamic imports with `ssr: false`.

Create a testing page (e.g., `app/editor/page.tsx` or `pages/editor.tsx`):

```tsx
'use client'; // Required if using Next.js App Router

import dynamic from 'next/dynamic';
// Import the compiled CSS for the editor UI
import '@openreel/web/style.css'; 

// Dynamically load the SDK and disable Server-Side Rendering
const Editor = dynamic(
  () => import('@openreel/web').then((mod) => mod.OpenReelEditor),
  { ssr: false, loading: () => <div style={{ padding: '2rem' }}>Loading Editor Engine...</div> }
);

export default function EditorTestingPage() {
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <Editor />
    </div>
  );
}
```

### 4. Run the Testing Server

Start your Next.js host application:
```bash
npm run dev
```
Navigate to your testing route (e.g., `http://localhost:3000/editor`). You should see the fully functional Digital Signage Editor embedded inside your application!

---

## Local Development & Modification

If you need to make changes to the editor's source code here rather than just embedding it:

1. Clone this repository locally.
2. Install dependencies via `pnpm install` (requires Node.js 18+).
3. Start the development server using `pnpm dev`.
4. Once your modifications are complete, you **must rebuild the SDK** so your host application receives the updates. Run `pnpm build` and commit the modified `apps/web/dist` folder to GitHub.
