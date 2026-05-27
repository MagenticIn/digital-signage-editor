import React, { useEffect, useRef, useState } from "react";
import type { VideoWidgetConfig } from "../../../types/widgets";

interface VideoWidgetProps {
  config: VideoWidgetConfig;
  /** Seconds elapsed since the widget became active (playhead - widget.startTime, clamped to >= 0). */
  widgetTime: number;
  /** Whether the editor timeline is currently playing. */
  isPlaying: boolean;
}

const SEEK_THRESHOLD = 0.15;

export const VideoWidget: React.FC<VideoWidgetProps> = ({ config, widgetTime, isPlaying }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Tri-state: `loading` covers the first-frame decode window after the
  // <video> mounts or its `src` changes — without an explicit overlay,
  // users see a black frame and read it as "the video didn't load".
  // `error` exposes load failures that would otherwise be silent.
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Reset to 0 whenever the source changes — covers config swaps and re-mounts.
  // Also reset the readiness state so the loader covers the new decode.
  useEffect(() => {
    setStatus("loading");
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
  }, [config.videoUrl]);

  // Sync currentTime + play/pause with the timeline on every relevant change.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (Math.abs(el.currentTime - widgetTime) > SEEK_THRESHOLD) {
      try {
        el.currentTime = widgetTime;
      } catch {
        /* ignore seek-before-ready */
      }
    }
    if (isPlaying) {
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } else {
      el.pause();
    }
  }, [widgetTime, isPlaying]);

  if (!config.videoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-white/70">
        Video URL not set
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full"
      style={{ backgroundColor: config.backgroundColor }}
    >
      <video
        ref={videoRef}
        src={config.videoUrl}
        className="w-full h-full"
        style={{ objectFit: config.objectFit, display: "block" }}
        muted={config.muted}
        loop={config.loop}
        controls={false}
        playsInline
        // `metadata` is enough to render the first frame and respond to
        // play/seek; the browser fetches more bytes lazily via Range as
        // the playhead advances. `auto` was forcing every visible
        // VideoWidget instance to fully buffer its file on mount.
        preload="metadata"
        crossOrigin="anonymous"
        onLoadedData={() => setStatus("ready")}
        onError={() => setStatus("error")}
      />
      {status === "loading" && <VideoFirstFrameOverlay label="Setting up video…" />}
      {status === "error" && (
        <VideoFirstFrameOverlay label="Video failed to load" tone="error" />
      )}
    </div>
  );
};

interface OverlayProps {
  label: string;
  tone?: "info" | "error";
}

const VideoFirstFrameOverlay: React.FC<OverlayProps> = ({ label, tone = "info" }) => (
  <div
    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
    style={{
      background: tone === "error" ? "rgba(40,0,0,0.65)" : "rgba(0,0,0,0.55)",
      color: "rgba(255,255,255,0.92)",
      fontSize: 12,
      letterSpacing: 0.2,
    }}
    aria-live="polite"
  >
    {tone === "info" && (
      <span
        className="inline-block animate-spin"
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.35)",
          borderTopColor: "rgba(255,255,255,0.95)",
          marginRight: 8,
        }}
      />
    )}
    {label}
  </div>
);

export default VideoWidget;
