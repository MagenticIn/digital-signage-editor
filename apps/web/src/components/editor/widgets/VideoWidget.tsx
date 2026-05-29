import React, { useEffect, useRef, useState } from "react";
import type { VideoWidgetConfig } from "../../../types/widgets";
import { MediaLoadingOverlay } from "./MediaLoadingOverlay";

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

  // Separate from the play-gate: drives the loading overlay, which stays up
  // until the clip is buffered enough to play through (not just first frame).
  const [fullyLoaded, setFullyLoaded] = useState(false);

  // Reset to 0 whenever the source changes — covers config swaps and re-mounts.
  // Also reset the readiness state so the loader covers the new decode.
  useEffect(() => {
    setStatus("loading");
    setFullyLoaded(false);
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
  }, [config.videoUrl]);

  // Hide the overlay once the element reports it can play through, with a
  // `progress`-based fallback for browsers that fire `canplaythrough`
  // unreliably. Never touches `src`, so cached media stays cached.
  const handleProgress = () => {
    const el = videoRef.current;
    if (!el || fullyLoaded) return;
    const { duration, buffered } = el;
    if (
      Number.isFinite(duration) &&
      duration > 0 &&
      buffered.length > 0 &&
      buffered.end(buffered.length - 1) >= duration - 0.25
    ) {
      setFullyLoaded(true);
    }
  };

  // Sync currentTime + play/pause with the timeline on every relevant change.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    // Don't drive the element until it has decoded its first frame.
    // Without this guard, the timeline keeps advancing widgetTime while
    // the element is still in HAVE_METADATA, triggering a perpetual
    // seek-ahead chase that prevents the decoder from ever producing a
    // frame (visible as a black canvas that only recovers after a
    // manual pause + play).
    if (status !== "ready") return;
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
  }, [widgetTime, isPlaying, status]);

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
        onCanPlay={() => setStatus("ready")}
        onCanPlayThrough={() => {
          setStatus("ready");
          setFullyLoaded(true);
        }}
        onProgress={handleProgress}
        onWaiting={() => setFullyLoaded(false)}
        onError={() => setStatus("error")}
      />
      {status === "error" ? (
        <MediaLoadingOverlay label="Video failed to load" tone="error" />
      ) : (
        !fullyLoaded && <MediaLoadingOverlay label="Loading video…" />
      )}
    </div>
  );
};

export default VideoWidget;
