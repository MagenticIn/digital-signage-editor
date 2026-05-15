import React, { useEffect, useRef } from "react";
import type { AudioWidgetConfig } from "../../../types/widgets";

interface AudioWidgetProps {
  config: AudioWidgetConfig;
  /** Seconds elapsed since the widget became active (playhead - widget.startTime, clamped to >= 0). */
  widgetTime: number;
  /** Whether the editor timeline is currently playing. */
  isPlaying: boolean;
}

const SEEK_THRESHOLD = 0.15;

export const AudioWidget: React.FC<AudioWidgetProps> = ({ config, widgetTime, isPlaying }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasSource = !!config.audioUrl;

  // Reset to 0 whenever the source changes.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
  }, [config.audioUrl]);

  // Keep volume in sync (this can change without triggering a re-mount).
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = Math.min(1, Math.max(0, config.volume ?? 1));
  }, [config.volume]);

  // Sync currentTime + play/pause with the timeline.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !hasSource) return;
    if (Math.abs(el.currentTime - widgetTime) > SEEK_THRESHOLD) {
      try {
        el.currentTime = widgetTime;
      } catch {
        /* ignore */
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
  }, [widgetTime, isPlaying, hasSource]);

  return (
    <div
      className={`relative w-full h-full ${
        config.hideUI ? "" : "flex flex-col items-center justify-center gap-2 text-white px-3 bg-black/40"
      }`}
    >
      {!config.hideUI && (
        <>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>🎵</span>
            <span>{config.title || "Audio"}</span>
            {config.muted && <span className="text-[10px] text-yellow-400/80">(muted)</span>}
          </div>
          {hasSource ? (
            <div className="text-[10px] text-white/60 truncate max-w-full">{config.audioUrl}</div>
          ) : (
            <div className="text-[10px] text-white/50">No source</div>
          )}
        </>
      )}
      {hasSource && (
        <audio
          ref={audioRef}
          src={config.audioUrl}
          loop={config.loop}
          muted={config.muted}
          className="hidden"
        />
      )}
      <div className="absolute inset-0 z-10" aria-hidden />
    </div>
  );
};

export default AudioWidget;
