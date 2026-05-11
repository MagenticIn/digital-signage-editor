import type { Project } from "@openreel/core";
import type { SignageWidget } from "../types/widgets";

/**
 * BroadcastChannel name shared by the editor tab and any open Preview tabs.
 * Both tabs are same-origin, so the browser routes messages between them.
 */
export const PREVIEW_CHANNEL_NAME = "openreel:preview";

export interface PreviewSnapshotMessage {
  type: "snapshot";
  project: Project;
  signageWidgets: SignageWidget[];
  effectiveDuration: number;
  ts: number;
}

export interface PreviewRequestMessage {
  type: "request-snapshot";
}

export type PreviewSyncMessage =
  | PreviewSnapshotMessage
  | PreviewRequestMessage;

/**
 * Returns a new BroadcastChannel bound to the preview channel, or `null` when
 * the runtime lacks BroadcastChannel support (very old browsers / SSR). The
 * caller is responsible for closing it on unmount.
 */
export const openPreviewChannel = (): BroadcastChannel | null => {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(PREVIEW_CHANNEL_NAME);
};
