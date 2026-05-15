import React, { useEffect, useRef } from "react";
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

  // Reset to 0 whenever the source changes — covers config swaps and re-mounts.
  useEffect(() => {
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
    <div className="w-full h-full" style={{ backgroundColor: config.backgroundColor }}>
      <video
        ref={videoRef}
        src={config.videoUrl}
        className="w-full h-full"
        style={{ objectFit: config.objectFit, display: "block" }}
        muted={config.muted}
        loop={config.loop}
        controls={false}
        playsInline
        preload="auto"
      />
    </div>
  );
};

export default VideoWidget;
