import React, { useEffect, useState, useRef, useCallback } from "react";

import { useRouter } from "../../hooks/use-router";
import { Toolbar } from "./Toolbar";
import { AssetsPanel } from "./AssetsPanel";
import { Preview } from "./Preview";
import { InspectorPanel } from "./InspectorPanel";
import { Timeline } from "./Timeline";
import { KeyframeEditorPanel } from "./KeyframeEditorPanel";
import { AudioMixer } from "../audio-mixer";
import { KeyboardShortcutsOverlay } from "./KeyboardShortcutsOverlay";
import { PanelErrorBoundary } from "../ErrorBoundary";
import { SpotlightTour, MoGraphTour } from "./tour";
import { SettingsDialog } from "./settings/SettingsDialog";
import { useProjectStore } from "../../stores/project-store";
import { useUIStore } from "../../stores/ui-store";
import { useEngineStore } from "../../stores/engine-store";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import {
  initializePlaybackBridge,
  disposePlaybackBridge,
  getPlaybackBridge,
} from "../../bridges/playback-bridge";
import { useTimelineStore } from "../../stores/timeline-store";
import {
  openPreviewChannel,
  type PreviewSyncMessage,
} from "../../services/preview-sync";
import {
  initializeMediaBridge,
  disposeMediaBridge,
} from "../../bridges/media-bridge";
import {
  initializeRenderBridge,
  disposeRenderBridge,
} from "../../bridges/render-bridge";
import {
  initializeEffectsBridge,
  disposeEffectsBridge,
} from "../../bridges/effects-bridge";
import {
  initializeTransitionBridge,
  disposeTransitionBridge,
} from "../../bridges/transition-bridge";

/**
 * Auto-save initialization hook
 */
const useAutoSave = () => {
  const { initializeAutoSave } = useProjectStore();

  useEffect(() => {
    initializeAutoSave().catch(console.error);
  }, [initializeAutoSave]);
};

/**
 * Engine and bridge initialization hook
 * Ensures all engines and bridges are fully initialized before rendering editor
 */
const useEngineInitialization = () => {
  const { initialize, initialized, initializing, initError } = useEngineStore();
  const [bridgesReady, setBridgesReady] = useState(false);
  const [initStatus, setInitStatus] = useState("Starting...");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initAll = async () => {
      try {
        const currentState = useEngineStore.getState();
        if (!currentState.initialized && !currentState.initializing) {
          setInitStatus("Initializing video engine...");
          await initialize();
        } else if (currentState.initializing) {
          await new Promise<void>((resolve) => {
            const unsubscribe = useEngineStore.subscribe((state) => {
              if (state.initialized || state.initError) {
                unsubscribe();
                resolve();
              }
            });
          });
        }

        if (!isMounted) return;

        const engineState = useEngineStore.getState();
        if (!engineState.initialized) {
          throw new Error(
            engineState.initError || "Engine initialization failed",
          );
        }

        setInitStatus("Initializing media bridge...");
        await initializeMediaBridge();
        if (!isMounted) return;

        setInitStatus("Initializing playback bridge...");
        await initializePlaybackBridge();
        if (!isMounted) return;

        setInitStatus("Initializing render bridge...");
        await initializeRenderBridge();
        if (!isMounted) return;

        setInitStatus("Initializing effects bridge...");
        const projectState = useProjectStore.getState();
        const { width, height } = projectState.project.settings;
        try {
          await initializeEffectsBridge(width, height);
        } catch (effectsError) {
          console.error(
            "[EditorInterface] EffectsBridge initialization failed:",
            effectsError,
          );
        }
        if (!isMounted) return;

        setInitStatus("Initializing transition bridge...");
        try {
          initializeTransitionBridge(width, height);
        } catch (transitionError) {
          console.error(
            "[EditorInterface] TransitionBridge initialization failed:",
            transitionError,
          );
        }
        if (!isMounted) return;

        setBridgesReady(true);
      } catch (error) {
        console.error("Failed to initialize engines/bridges:", error);
        if (isMounted) {
          setLocalError(
            error instanceof Error ? error.message : "Unknown error",
          );
          setInitStatus(
            `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }
    };

    initAll();

    return () => {
      isMounted = false;
      disposePlaybackBridge();
      disposeMediaBridge();
      disposeRenderBridge();
      disposeEffectsBridge();
      disposeTransitionBridge();
    };
  }, [initialize, initialized, initializing]);

  return {
    initialized: initialized && bridgesReady,
    initializing: initializing || (!bridgesReady && initialized),
    initError: initError || localError,
    initStatus,
  };
};

/**
 * Main Editor Interface Component
 */
export const EditorInterface: React.FC = () => {
  const { initialized, initializing, initError, initStatus } =
    useEngineInitialization();

  const { showShortcutsOverlay, setShowShortcutsOverlay } =
    useKeyboardShortcuts();
  useAutoSave();

  const { params } = useRouter();
  const isPreview = params.preview === "1";
  const isFullscreen = params.fullscreen === "1";
  const layoutName = params.signageLayoutName ?? "Layout Preview";

  // Autoplay + loop when entering full-screen preview.
  // Also seek-to-0 + restart on every broadcast snapshot from the editor tab,
  // so live edits play immediately from the top.
  useEffect(() => {
    if (!isFullscreen) return;

    const bridge = getPlaybackBridge();
    let hasStartedOnce = false;
    let loopTimer: number | null = null;

    const startPlayback = () => {
      bridge.seek(0).then(() => bridge.play());
      hasStartedOnce = true;
    };

    // Defer slightly so the masterClock duration is in place (it's set by
    // playback-controller on the first ProjectChanged event).
    const initialTimer = window.setTimeout(startPlayback, 200);

    // Subscribe to playbackState. Once we've started, transitioning to
    // "stopped" means the master clock hit the layout end — loop back.
    const unsub = useTimelineStore.subscribe(
      (s) => s.playbackState,
      (state) => {
        if (!hasStartedOnce) return;
        if (state === "stopped") {
          if (loopTimer != null) window.clearTimeout(loopTimer);
          loopTimer = window.setTimeout(startPlayback, 150);
        }
      },
    );

    // Live updates from the editor: every snapshot restarts playback at 0 so
    // the preview always shows the latest edit from the top.
    const channel = openPreviewChannel();
    const onMessage = (event: MessageEvent<PreviewSyncMessage>) => {
      if (event.data?.type !== "snapshot") return;
      // Stores are re-hydrated by App.tsx's effect; here we just resync playback.
      window.setTimeout(startPlayback, 100);
    };
    channel?.addEventListener("message", onMessage);

    return () => {
      window.clearTimeout(initialTimer);
      if (loopTimer != null) window.clearTimeout(loopTimer);
      unsub();
      if (channel) {
        channel.removeEventListener("message", onMessage);
        channel.close();
      }
      bridge.pause();
    };
  }, [isFullscreen]);

  const {
    keyframeEditorOpen,
    setKeyframeEditorOpen,
    getSelectedClipIds,
    panels,
    setPanelVisible,
    setPanelHeight,
  } = useUIStore();
  const { project, updateClipKeyframes } = useProjectStore();
  const tracks = project.timeline.tracks;

  const [selectedKeyframeIds, setSelectedKeyframeIds] = React.useState<string[]>([]);
  const [copiedKeyframes, setCopiedKeyframes] = React.useState<import("@openreel/core").Keyframe[]>([]);

  const selectedClip = React.useMemo(() => {
    const selectedIds = getSelectedClipIds();
    if (selectedIds.length === 0) return null;
    const clipId = selectedIds[0];
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) return clip;
    }
    return null;
  }, [getSelectedClipIds, tracks]);

  const handleUpdateKeyframe = React.useCallback(
    (keyframeId: string, updates: Partial<import("@openreel/core").Keyframe>) => {
      if (!selectedClip?.keyframes) return;
      const keyframes = selectedClip.keyframes.map((kf) =>
        kf.id === keyframeId ? { ...kf, ...updates } : kf
      );
      updateClipKeyframes(selectedClip.id, keyframes);
    },
    [selectedClip, updateClipKeyframes]
  );

  const handleDeleteKeyframe = React.useCallback(
    (keyframeId: string) => {
      if (!selectedClip?.keyframes) return;
      const keyframes = selectedClip.keyframes.filter((kf) => kf.id !== keyframeId);
      updateClipKeyframes(selectedClip.id, keyframes);
      setSelectedKeyframeIds((prev) => prev.filter((id) => id !== keyframeId));
    },
    [selectedClip, updateClipKeyframes]
  );

  const handleCopyKeyframes = React.useCallback(
    (keyframeIds: string[]) => {
      if (!selectedClip?.keyframes) return;
      const toCopy = selectedClip.keyframes.filter((kf) => keyframeIds.includes(kf.id));
      setCopiedKeyframes(toCopy);
    },
    [selectedClip]
  );

  const handlePasteKeyframes = React.useCallback(
    (clipId: string, time: number) => {
      const targetClip = tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
      if (!targetClip) return;
      const newKeyframes = copiedKeyframes.map((kf) => ({
        ...kf,
        id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        time: kf.time + time,
      }));
      updateClipKeyframes(clipId, [...(targetClip.keyframes || []), ...newKeyframes]);
    },
    [copiedKeyframes, tracks, updateClipKeyframes]
  );

  const handleSelectKeyframe = React.useCallback(
    (keyframeId: string, addToSelection: boolean) => {
      if (addToSelection) {
        setSelectedKeyframeIds((prev) =>
          prev.includes(keyframeId)
            ? prev.filter((id) => id !== keyframeId)
            : [...prev, keyframeId]
        );
      } else {
        setSelectedKeyframeIds([keyframeId]);
      }
    },
    []
  );

  const timelineVisible = panels.timeline?.visible ?? true;
  const timelineHeight = panels.timeline?.height ?? 320;
  const isDraggingRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const newHeight = window.innerHeight - e.clientY;
      const maxHeight = window.innerHeight * 0.6;
      setPanelHeight(
        "timeline",
        Math.max(200, Math.min(newHeight, maxHeight)),
      );
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setPanelHeight]);

  if (initializing || !initialized) {
    return (
      <div className="w-full h-full bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary text-sm">Initializing editor...</p>
          <p className="text-text-muted text-xs mt-2">{initStatus}</p>
          {initError && (
            <p className="text-red-500 text-xs mt-2">{initError}</p>
          )}
        </div>
      </div>
    );
  }

  // Full-screen playback: no chrome, just the Preview canvas filling the viewport.
  if (isFullscreen) {
    return (
      <div className="w-screen h-screen bg-black overflow-hidden">
        <PanelErrorBoundary name="Preview">
          <Preview />
        </PanelErrorBoundary>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background flex flex-col overflow-hidden font-sans select-none relative z-20 text-xs text-text-secondary">
      {/* Preview mode banner — replaces toolbar for read-only previews */}
      {isPreview ? (
        <div className="h-10 shrink-0 flex items-center justify-between px-4 bg-zinc-900 border-b border-zinc-700 z-30">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              PREVIEW
            </span>
            <span className="text-xs text-zinc-300 truncate max-w-[260px]">{layoutName}</span>
          </div>
          <button
            onClick={() => window.close()}
            className="text-zinc-400 hover:text-white text-xs px-3 py-1 rounded hover:bg-zinc-700 transition-colors"
          >
            Close preview
          </button>
        </div>
      ) : (
        /* Main App Toolbar */
        <Toolbar />
      )}

      {/* Workspace Area — preview flex-1 grows when side panels are hidden */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {(panels.mediaLibrary?.visible ?? true) ? (
          <PanelErrorBoundary name="Assets Panel">
            <AssetsPanel />
          </PanelErrorBoundary>
        ) : null}

        <PanelErrorBoundary name="Preview">
          <Preview />
        </PanelErrorBoundary>

        {(panels.inspector?.visible ?? true) ? (
          <PanelErrorBoundary name="Inspector">
            <InspectorPanel />
          </PanelErrorBoundary>
        ) : null}

        {keyframeEditorOpen && (
          <PanelErrorBoundary name="Keyframe Editor">
            <KeyframeEditorPanel
              clip={selectedClip}
              onClose={() => setKeyframeEditorOpen(false)}
              onUpdateKeyframe={handleUpdateKeyframe}
              onDeleteKeyframe={handleDeleteKeyframe}
              onCopyKeyframes={handleCopyKeyframes}
              onPasteKeyframes={handlePasteKeyframes}
              selectedKeyframeIds={selectedKeyframeIds}
              onSelectKeyframe={handleSelectKeyframe}
              copiedKeyframes={copiedKeyframes}
            />
          </PanelErrorBoundary>
        )}
      </div>

      {timelineVisible ? (
        <div
          className="h-1 bg-border hover:bg-primary/50 cursor-row-resize transition-colors z-10 relative group shrink-0"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-x-0 -top-1 -bottom-1 bg-transparent" />
        </div>
      ) : null}

      {/* Audio Mixer (when open) */}
      {panels.audioMixer?.visible && (
        <PanelErrorBoundary name="Audio Mixer">
          <AudioMixer
            visible
            onClose={() => setPanelVisible("audioMixer", false)}
          />
        </PanelErrorBoundary>
      )}

      {timelineVisible ? (
        <div
          style={{ height: timelineHeight }}
          className="shrink-0 flex flex-col min-h-0"
        >
          <PanelErrorBoundary name="Timeline">
            <Timeline />
          </PanelErrorBoundary>
        </div>
      ) : null}

      <KeyboardShortcutsOverlay
        isOpen={showShortcutsOverlay}
        onClose={() => setShowShortcutsOverlay(false)}
      />

      <SpotlightTour />
      <MoGraphTour />

      <SettingsDialog />
    </div>
  );
};

export default EditorInterface;
