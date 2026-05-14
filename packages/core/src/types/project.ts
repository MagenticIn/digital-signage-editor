import type { Timeline } from "./timeline";
import type { TextClip } from "../text/types";
import type { ShapeClip, SVGClip, StickerClip } from "../graphics/types";

export interface ProjectSettings {
  readonly width: number;
  readonly height: number;
  readonly frameRate: number;
  readonly sampleRate: number;
  readonly channels: number;
  /** Canvas background colour as rgba(r,g,b,a) or any CSS color string. Defaults to black. */
  readonly backgroundColor?: string;
  /** Text shown on the empty canvas before any media/widgets are added. */
  readonly placeholderText?: string;
  /** Color of the placeholder text. CSS color string. */
  readonly placeholderTextColor?: string;
  /** Font size of the placeholder text in canvas pixels. */
  readonly placeholderFontSize?: number;
  /**
   * Total play duration of the layout, in seconds.
   * When set, takes precedence over the timeline's auto-computed duration
   * (which is the max clip end time). Useful for signage layouts that are
   * widget-only or that should loop/end at a fixed time regardless of clip lengths.
   */
  readonly playDuration?: number;
}

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly modifiedAt: number;
  readonly settings: ProjectSettings;
  readonly mediaLibrary: MediaLibrary;
  readonly timeline: Timeline;
  readonly textClips?: TextClip[];
  readonly shapeClips?: ShapeClip[];
  readonly svgClips?: SVGClip[];
  readonly stickerClips?: StickerClip[];
  /**
   * Signage widgets (clock, ticker, iframe, …) overlaid on the canvas.
   * Holds `SignageWidget`-shaped objects; typed as `unknown[]` at this layer
   * to avoid an upward import from the web app — the web app casts on read,
   * mirroring how `MediaItem.widgetConfig` is kept as a generic record here.
   */
  readonly signageWidgets?: readonly unknown[];
}

export interface MediaLibrary {
  readonly items: MediaItem[];
}

export interface MediaItem {
  readonly id: string;
  readonly name: string;
  readonly type: "video" | "audio" | "image" | "widget";
  readonly fileHandle: FileSystemFileHandle | null;
  readonly blob: Blob | null;
  readonly metadata: MediaMetadata;
  readonly thumbnailUrl: string | null;
  readonly waveformData: Float32Array | null;
  readonly filmstripThumbnails?: FilmstripThumbnail[];
  readonly isPlaceholder?: boolean;
  readonly originalUrl?: string;
  /** Snapshot of the signage-media library entry this item was sourced from.
   *  Persisted in saved JSON so downstream tooling (backend, replayer) can
   *  reconcile the clip with its catalog entry even if `originalUrl` rotates. */
  readonly libraryMedia?: LibraryMediaRef;
  /** File hint stored in JSON for cross-session/cross-machine asset matching */
  readonly sourceFile?: { name: string; size: number; lastModified: number; folder?: string };

  /**
   * Widget metadata — set only when `type === "widget"`.
   * `widgetType` is the web-app `SignageWidgetType` literal (string in core to
   * avoid an upward import). `widgetConfig` is the matching `WidgetConfig`
   * union member (kept as a generic record at this layer; the web app casts
   * on read).
   */
  readonly widgetType?: string;
  readonly widgetConfig?: Record<string, unknown>;
  /** Widget canvas placement in design-space pixels — same shape as the old SignageWidget.layout. */
  readonly widgetLayout?: { x: number; y: number; width: number; height: number };
}

/**
 * JSON-safe snapshot of a signage-media library entry. Persisted on
 * `MediaItem.libraryMedia` (when an asset was picked into the AssetsPanel
 * via the library) and on the relevant widget `config.libraryMedia` (when
 * picked directly from a widget inspector). Carries the persistable fields
 * of `SignageMediaItem` so backend / replayer / sync tooling can reconcile
 * the asset with its library catalog entry.
 */
export interface LibraryMediaRef {
  readonly id: string;
  readonly name: string;
  readonly originalName: string | null;
  readonly storageKey: string | null;
  readonly source: "UPLOAD" | "URL";
  /** MIME-ish type string from the library entry (e.g. "image/png"). */
  readonly mimeType: string;
  readonly durationSeconds: number | null;
  readonly thumbnailUrl: string | null;
  readonly fileUrl: string | null;
  /** URL we resolved via `resolveLibraryAssetUrl` at pick time. */
  readonly resolvedUrl: string;
}

/** Thumbnail for filmstrip display in timeline */
export interface FilmstripThumbnail {
  readonly timestamp: number;
  readonly url: string;
}

export interface MediaMetadata {
  readonly duration: number; // In seconds
  readonly width: number; // For video/image
  readonly height: number; // For video/image
  readonly frameRate: number; // For video
  readonly codec: string;
  readonly sampleRate: number; // For audio
  readonly channels: number; // For audio
  readonly fileSize: number;
}

/**
 * Effective end-time for playback/export. Prefers the explicit
 * `settings.playDuration` override (set in the Canvas inspector) over the
 * auto-computed `timeline.duration` (max clip end time).
 */
export const getEffectiveProjectDuration = (project: {
  readonly settings: ProjectSettings;
  readonly timeline: Timeline;
}): number => {
  const override = project.settings.playDuration;
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return override;
  }
  return project.timeline.duration;
};
