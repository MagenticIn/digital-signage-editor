import "./index.css";
import React from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import App from "./App";

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined;

if (typeof window !== "undefined" && POSTHOG_KEY && POSTHOG_HOST) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
  });
}

/**
 * Full OpenReel editor experience for embedding (e.g. in Next.js).
 * Imports global styles; host app should use a client boundary if required.
 */
export function OpenReelEditor() {
  const tree = <App />;
  if (POSTHOG_KEY && POSTHOG_HOST) {
    return (
      <React.StrictMode>
        <PostHogProvider client={posthog}>{tree}</PostHogProvider>
      </React.StrictMode>
    );
  }
  return <React.StrictMode>{tree}</React.StrictMode>;
}

export default OpenReelEditor;
