import type { Project } from "@openreel/core";
import type { SignageWidget } from "../types/widgets";

export const PREVIEW_SNAPSHOT_KEY = "openreel:preview-snapshot";

export interface PreviewSnapshot {
  exportedAt: string;
  project: Project;
  signageWidgets: SignageWidget[];
  /** max(clip ends, widget ends, settings.playDuration, 0) — what the replayer should use as the layout play time. */
  effectiveDuration: number;
}

export const writePreviewSnapshot = (snapshot: PreviewSnapshot): void => {
  try {
    sessionStorage.setItem(PREVIEW_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.error("Failed to write preview snapshot", err);
  }
};

export const readPreviewSnapshot = (): PreviewSnapshot | null => {
  try {
    const raw = sessionStorage.getItem(PREVIEW_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PreviewSnapshot;
  } catch (err) {
    console.error("Failed to read preview snapshot", err);
    return null;
  }
};

export const clearPreviewSnapshot = (): void => {
  try {
    sessionStorage.removeItem(PREVIEW_SNAPSHOT_KEY);
  } catch {
    // ignore
  }
};
