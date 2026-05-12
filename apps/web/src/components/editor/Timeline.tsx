import React, {
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Undo2,
  Redo2,
  Rows3,
  Rows2,
  X,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useProjectStore } from "../../stores/project-store";
import { useTimelineStore } from "../../stores/timeline-store";
import { useUIStore } from "../../stores/ui-store";
import {
  cloneDefaultWidgetConfig,
  useSignageWidgetStore,
} from "../../stores/signage-widget-store";
import type { SignageWidgetType } from "../../types/widgets";
import { toast } from "../../stores/notification-store";
import { useEngineStore } from "../../stores/engine-store";
import { getPlaybackBridge } from "../../bridges/playback-bridge";
import {
  IconButton,
  ContextMenu,
  ContextMenuTrigger,
  // DropdownMenu,
  // DropdownMenuTrigger,
  // DropdownMenuContent,
  // DropdownMenuItem,
  // DropdownMenuSeparator,
} from "@openreel/ui";
import {
  Playhead,
  TimeRuler,
  TrackHeader,
  TrackLane,
  BeatMarkerOverlay,
  MarkerIndicator,
  formatTimecode,
} from "./timeline/index";
import { WidgetContextMenu } from "./timeline/WidgetContextMenu";

export const Timeline: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<HTMLDivElement>(null);

  const {
    project,
    undo,
    redo,
    canUndo,
    canRedo,
    reorderTrack,
    removeMarker,
    updateMarker,
    updateClipKeyframes,
  } = useProjectStore();
  const tracks = project.timeline.tracks;

  const [draggedTrackId, setDraggedTrackId] = React.useState<string | null>(
    null,
  );

  const {
    playheadPosition,
    playbackState,
    pixelsPerSecond,
    scrollX,
    scrollY,
    viewportWidth,
    setScrollX,
    setScrollY,
    setViewportDimensions,
    zoomIn,
    zoomOut,
    trackHeight,
    setTrackHeight,
    setTrackHeightById,
    getTrackHeight,
  } = useTimelineStore();

  const {
    select,
    selectMultiple,
    clearSelection,
    getSelectedClipIds,
    snapSettings,
    setPanelVisible,
  } = useUIStore();
  const selectedItems = useUIStore((state) => state.selectedItems);
  const widgets = useSignageWidgetStore((state) => state.widgets);
  const addWidget = useSignageWidgetStore((state) => state.addWidget);
  const updateWidget = useSignageWidgetStore((state) => state.updateWidget);
  const removeWidget = useSignageWidgetStore((state) => state.removeWidget);
  const selectedClipIds = getSelectedClipIds();
  const selectedWidgetId = selectedItems.find((item) => item.type === "widget")?.id;

  const { getTitleEngine, getGraphicsEngine } = useEngineStore();
  const titleEngine = getTitleEngine();
  const allTextClips = useMemo(() => {
    return titleEngine?.getAllTextClips() ?? [];
  }, [titleEngine, project.modifiedAt]);

  const getTextClipsForTrack = useCallback(
    (trackId: string) => {
      return allTextClips.filter((tc) => tc.trackId === trackId);
    },
    [allTextClips],
  );

  const graphicsEngine = getGraphicsEngine();
  const allShapeClips = useMemo(() => {
    const shapes = graphicsEngine?.getAllShapeClips() ?? [];
    const svgs = graphicsEngine?.getAllSVGClips() ?? [];
    const stickers = graphicsEngine?.getAllStickerClips() ?? [];
    return [...shapes, ...svgs, ...stickers];
  }, [graphicsEngine, project.modifiedAt]);

  const getShapeClipsForTrack = useCallback(
    (trackId: string) => {
      return allShapeClips.filter((sc) => sc.trackId === trackId);
    },
    [allShapeClips],
  );
  const [isBoxSelecting, setIsBoxSelecting] = React.useState(false);
  const [selectionBox, setSelectionBox] = React.useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const playDurationOverride = project.settings.playDuration;
  const timelineDuration = useMemo(() => {
    let maxEnd = 0;
    for (const track of tracks) {
      for (const clip of track.clips) {
        const end = clip.startTime + clip.duration;
        if (end > maxEnd) maxEnd = end;
      }
    }
    for (const widget of widgets) {
      const end = widget.startTime + widget.duration;
      if (end > maxEnd) maxEnd = end;
    }
    // Floor: clip/widget extent, the user's explicit playDuration, or 10 s
    // (never the hardcoded 60 s anymore). The override only raises the floor —
    // longer clips still extend the ruler past it.
    return Math.max(maxEnd, playDurationOverride ?? 0, 10);
  }, [tracks, widgets, playDurationOverride]);

  const totalTracksHeight = useMemo(() => {
    let height = 0;
    for (const track of tracks) {
      height += getTrackHeight(track.id);
    }
    height += widgets.length * 56;
    return height;
  }, [tracks, getTrackHeight, widgets.length]);

  const defaultWidgetColor = { labelBg: "#3d3d3d", blockBg: "#4a4a4a", text: "#ffffff" };
  const widgetColorMap: Partial<Record<
    SignageWidgetType,
    { labelBg: string; blockBg: string; text: string }
  >> = {
    calendar: { labelBg: "#2e5c2e", blockBg: "#3a7a3a", text: "#e6ffe6" },
    chart: { labelBg: "#2e3a5c", blockBg: "#3a4a7a", text: "#e6edff" },
    clock: { labelBg: "#5c522e", blockBg: "#7a6e3a", text: "#fffae6" },
    countdown: { labelBg: "#5c2e5c", blockBg: "#7a3a7a", text: "#ffe6ff" },
    iframe: { labelBg: "#3d3d5c", blockBg: "#52527a", text: "#e6e6ff" },
    pdf: { labelBg: "#5c3333", blockBg: "#7a4444", text: "#ffe6e6" },
    powerpoint: { labelBg: "#5c4433", blockBg: "#7a5c44", text: "#ffece6" },
    ticker: { labelBg: "#335c66", blockBg: "#447a8a", text: "#e6f7ff" },
  };
  const widgetLabelMap: Partial<Record<SignageWidgetType, string>> = {
    htmlPackage: "HTML",
    videoIn: "Video In",
    datasetView: "Dataset",
    shellCommand: "Shell",
    iframe: "Embed",
    hls: "HLS Stream",
    pdf: "PDF",
  };
  const widgetDisplayName = (type: SignageWidgetType) =>
    widgetLabelMap[type] ?? type.charAt(0).toUpperCase() + type.slice(1);

  const [draggingWidgetId, setDraggingWidgetId] = useState<string | null>(null);
  const [dragOffsetSeconds, setDragOffsetSeconds] = useState(0);
  const [resizingWidget, setResizingWidget] = useState<{
    id: string;
    edge: "start" | "end";
  } | null>(null);

  const getSnappedTime = useCallback(
    (candidate: number) => {
      if (!snapSettings.enabled) return Math.max(0, candidate);
      const threshold = snapSettings.snapThreshold / pixelsPerSecond;
      const allSnapPoints = [
        playheadPosition,
        ...tracks.flatMap((track) =>
          track.clips.flatMap((clip) => [clip.startTime, clip.startTime + clip.duration]),
        ),
        ...widgets.flatMap((widget) => [widget.startTime, widget.startTime + widget.duration]),
      ];
      let best = candidate;
      let bestDist = Infinity;
      for (const point of allSnapPoints) {
        const dist = Math.abs(point - candidate);
        if (dist < threshold && dist < bestDist) {
          bestDist = dist;
          best = point;
        }
      }
      return Math.max(0, best);
    },
    [snapSettings, pixelsPerSecond, playheadPosition, tracks, widgets],
  );

  useEffect(() => {
    if (!draggingWidgetId && !resizingWidget) return;
    const handleMouseMove = (event: MouseEvent) => {
      if (!tracksRef.current) return;
      const rect = tracksRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left + scrollX;
      const pointerTime = Math.max(0, x / pixelsPerSecond);

      if (draggingWidgetId) {
        const nextStart = getSnappedTime(pointerTime - dragOffsetSeconds);
        updateWidget(draggingWidgetId, { startTime: nextStart });
      }

      if (resizingWidget) {
        const widget = widgets.find((item) => item.id === resizingWidget.id);
        if (!widget) return;
        const snappedTime = getSnappedTime(pointerTime);
        if (resizingWidget.edge === "start") {
          const end = widget.startTime + widget.duration;
          const startTime = Math.max(0, Math.min(snappedTime, end - 0.2));
          updateWidget(widget.id, {
            startTime,
            duration: Math.max(0.2, end - startTime),
          });
        } else {
          const end = Math.max(widget.startTime + 0.2, snappedTime);
          updateWidget(widget.id, { duration: Math.max(0.2, end - widget.startTime) });
        }
      }
    };
    const handleMouseUp = () => {
      setDraggingWidgetId(null);
      setResizingWidget(null);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    draggingWidgetId,
    resizingWidget,
    dragOffsetSeconds,
    pixelsPerSecond,
    scrollX,
    widgets,
    updateWidget,
    getSnappedTime,
  ]);

  useEffect(() => {
    if (!selectedWidgetId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      const widget = widgets.find((item) => item.id === selectedWidgetId);
      if (!widget) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeWidget(widget.id);
        clearSelection();
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const step = event.shiftKey ? 1 : 0.1;
        const delta = event.key === "ArrowLeft" ? -step : step;
        updateWidget(widget.id, { startTime: Math.max(0, widget.startTime + delta) });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedWidgetId, widgets, updateWidget, removeWidget, clearSelection]);

  const trackHeightsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const track of tracks) {
      map.set(track.id, getTrackHeight(track.id));
    }
    return map;
  }, [tracks, getTrackHeight]);

  const handleTrackDragStart = useCallback(
    (e: React.DragEvent, trackId: string) => {
      e.dataTransfer.setData("trackId", trackId);
      e.dataTransfer.effectAllowed = "move";
      setDraggedTrackId(trackId);
    },
    [],
  );

  const handleTrackDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleTrackDrop = useCallback(
    async (e: React.DragEvent, targetTrackId: string) => {
      e.preventDefault();
      const sourceTrackId = e.dataTransfer.getData("trackId");
      setDraggedTrackId(null);

      if (sourceTrackId && sourceTrackId !== targetTrackId) {
        const targetIndex = tracks.findIndex((t) => t.id === targetTrackId);
        if (targetIndex !== -1) {
          await reorderTrack(sourceTrackId, targetIndex);
        }
      }
    },
    [tracks, reorderTrack],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportDimensions(
          entry.contentRect.width,
          entry.contentRect.height,
        );
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [setViewportDimensions]);

  useEffect(() => {
    if (playbackState !== "playing") return;

    const playheadPixels = playheadPosition * pixelsPerSecond;
    const visibleEnd = scrollX + viewportWidth - 150;

    if (playheadPixels > visibleEnd && tracksRef.current) {
      const newScrollX = playheadPixels - viewportWidth + 200;
      tracksRef.current.scrollLeft = Math.max(0, newScrollX);
    }
  }, [playheadPosition, playbackState, pixelsPerSecond, scrollX, viewportWidth]);

  const handleSelectClip = useCallback(
    (clipId: string, addToSelection: boolean) => {
      const isTextClip = allTextClips.some((tc) => tc.id === clipId);
      if (isTextClip) {
        const textClip = allTextClips.find((tc) => tc.id === clipId);
        select(
          { type: "text-clip", id: clipId, trackId: textClip?.trackId },
          addToSelection,
        );
        return;
      }
      const isShapeClip = allShapeClips.some((sc) => sc.id === clipId);
      if (isShapeClip) {
        const shapeClip = allShapeClips.find((sc) => sc.id === clipId);
        select(
          { type: "shape-clip", id: clipId, trackId: shapeClip?.trackId },
          addToSelection,
        );
        return;
      }

      let trackId: string | undefined;
      for (const track of tracks) {
        if (track.clips.some((c) => c.id === clipId)) {
          trackId = track.id;
          break;
        }
      }
      select({ type: "clip", id: clipId, trackId }, addToSelection);
    },
    [tracks, select, allTextClips, allShapeClips],
  );

  const [selectedKeyframeIds, setSelectedKeyframeIds] = useState<string[]>([]);

  const handleKeyframeSelect = useCallback(
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

  const handleKeyframeMove = useCallback(
    (keyframeId: string, newTime: number) => {
      for (const track of tracks) {
        for (const clip of track.clips) {
          const keyframe = clip.keyframes?.find((kf) => kf.id === keyframeId);
          if (keyframe) {
            const updatedKeyframes = clip.keyframes?.map((kf) =>
              kf.id === keyframeId ? { ...kf, time: Math.max(0, newTime) } : kf
            );
            if (updatedKeyframes) {
              updateClipKeyframes(clip.id, updatedKeyframes);
            }
            return;
          }
        }
      }
    },
    [tracks, updateClipKeyframes]
  );

  const handleKeyframeDelete = useCallback(
    (keyframeId: string) => {
      for (const track of tracks) {
        for (const clip of track.clips) {
          const keyframe = clip.keyframes?.find((kf) => kf.id === keyframeId);
          if (keyframe) {
            const updatedKeyframes = clip.keyframes?.filter(
              (kf) => kf.id !== keyframeId
            );
            if (updatedKeyframes) {
              updateClipKeyframes(clip.id, updatedKeyframes);
            }
            setSelectedKeyframeIds((prev) =>
              prev.filter((id) => id !== keyframeId)
            );
            return;
          }
        }
      }
    },
    [tracks, updateClipKeyframes]
  );

  // const handleSplit = useCallback(async () => {
  //   if (selectedClipIds.length === 1) {
  //     await splitClip(selectedClipIds[0], playheadPosition);
  //   }
  // }, [selectedClipIds, playheadPosition, splitClip]);

  const handleBackgroundClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const handleBoxSelectionStart = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest(".clip-component")) return;

      const rect = tracksRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Convert viewport coordinates to timeline coordinates by accounting for scroll position
      const x = e.clientX - rect.left + scrollX;
      const y = e.clientY - rect.top + scrollY;

      setIsBoxSelecting(true);
      setSelectionBox({
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
      });
    },
    [scrollX, scrollY],
  );

  const handleBoxSelectionMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isBoxSelecting || !selectionBox) return;

      const rect = tracksRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left + scrollX;
      const y = e.clientY - rect.top + scrollY;

      setSelectionBox({
        ...selectionBox,
        currentX: x,
        currentY: y,
      });
    },
    [isBoxSelecting, selectionBox, scrollX, scrollY],
  );

  const handleBoxSelectionEnd = useCallback(() => {
    if (!isBoxSelecting || !selectionBox) {
      setIsBoxSelecting(false);
      setSelectionBox(null);
      return;
    }

    // Convert pixel coordinates to timeline time using current zoom level
    const minX = Math.min(selectionBox.startX, selectionBox.currentX);
    const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
    const minTime = minX / pixelsPerSecond;
    const maxTime = maxX / pixelsPerSecond;

    let currentY = 0;
    const selectedItems: { type: "clip"; id: string; trackId: string }[] = [];

    // Iterate through tracks to find which are overlapped by selection box
    for (const track of tracks) {
      const trackH = getTrackHeight(track.id);
      const trackMinY = currentY;
      const trackMaxY = currentY + trackH;

      const minY = Math.min(selectionBox.startY, selectionBox.currentY);
      const maxY = Math.max(selectionBox.startY, selectionBox.currentY);

      // Check if selection box vertically overlaps this track
      const trackOverlaps = minY < trackMaxY && maxY > trackMinY;

      if (trackOverlaps) {
        for (const clip of track.clips) {
          const clipStart = clip.startTime;
          const clipEnd = clip.startTime + clip.duration;

          // Check if selection box time range overlaps clip time range
          const clipOverlaps = minTime < clipEnd && maxTime > clipStart;

          if (clipOverlaps) {
            selectedItems.push({
              type: "clip",
              id: clip.id,
              trackId: track.id,
            });
          }
        }
      }

      currentY += trackH;
    }

    if (selectedItems.length > 0) {
      selectMultiple(selectedItems);
    }

    setIsBoxSelecting(false);
    setSelectionBox(null);
  }, [
    isBoxSelecting,
    selectionBox,
    pixelsPerSecond,
    tracks,
    getTrackHeight,
    selectMultiple,
  ]);

  useEffect(() => {
    if (!isBoxSelecting) return;

    const handleMouseUp = () => handleBoxSelectionEnd();
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [isBoxSelecting, handleBoxSelectionEnd]);

  const handleDropMedia = useCallback(
    async (trackId: string, mediaId: string, startTime: number) => {
      const { addClip, addClipToNewTrack } = useProjectStore.getState();
      if (trackId) {
        await addClip(trackId, mediaId, startTime);
      } else {
        await addClipToNewTrack(mediaId, startTime);
      }
    },
    [],
  );

  const { moveClip } = useProjectStore();
  const handleMoveClip = useCallback(
    async (clipId: string, newStartTime: number, targetTrackId?: string) => {
      const graphicClip = allShapeClips.find((sc) => sc.id === clipId);
      if (graphicClip && graphicsEngine) {
        if (graphicClip.type === "sticker" || graphicClip.type === "emoji") {
          graphicsEngine.updateStickerClip(clipId, { startTime: newStartTime });
        } else if (graphicClip.type === "svg") {
          graphicsEngine.updateSVGClip(clipId, { startTime: newStartTime });
        } else {
          graphicsEngine.updateShapeClip(clipId, { startTime: newStartTime });
        }
        useProjectStore.setState((state) => ({
          project: { ...state.project, modifiedAt: Date.now() },
        }));
      } else {
        await moveClip(clipId, newStartTime, targetTrackId);
      }
    },
    [moveClip, allShapeClips, graphicsEngine],
  );

  const [snapIndicatorTime, setSnapIndicatorTime] = React.useState<
    number | null
  >(null);

  const handleSnapIndicator = useCallback((time: number | null) => {
    setSnapIndicatorTime(time);
  }, []);

  const handleTrimTextClip = useCallback(
    (clipId: string, edge: "left" | "right", newTime: number) => {
      if (!titleEngine) return;

      const textClip = allTextClips.find((tc) => tc.id === clipId);
      if (!textClip) return;

      const oldDuration = textClip.duration;
      const newDuration =
        edge === "left"
          ? Math.max(0.1, textClip.startTime + textClip.duration - newTime)
          : Math.max(0.1, newTime - textClip.startTime);

      const adjustedKeyframes = textClip.keyframes.map((kf) => {
        if (kf.id.startsWith("kf-exit-")) {
          const relativeTime = kf.time - oldDuration;
          return { ...kf, time: newDuration + relativeTime };
        }
        return kf;
      });

      if (edge === "left") {
        titleEngine.updateTextClip(clipId, {
          startTime: newTime,
          duration: newDuration,
        });
      } else {
        titleEngine.updateTextClip(clipId, {
          duration: newDuration,
        });
      }

      useProjectStore
        .getState()
        .updateTextClipKeyframes(clipId, adjustedKeyframes);

      useProjectStore.setState((state) => ({
        project: { ...state.project, modifiedAt: Date.now() },
      }));
    },
    [titleEngine, allTextClips],
  );

  const handleMoveTextClip = useCallback(
    (clipId: string, newStartTime: number) => {
      if (!titleEngine) return;

      const textClip = allTextClips.find((tc) => tc.id === clipId);
      if (!textClip) return;

      titleEngine.updateTextClip(clipId, {
        startTime: Math.max(0, newStartTime),
      });

      useProjectStore.setState((state) => ({
        project: { ...state.project, modifiedAt: Date.now() },
      }));
    },
    [titleEngine, allTextClips],
  );

  const handleTrimShapeClip = useCallback(
    (clipId: string, edge: "left" | "right", newTime: number) => {
      if (!graphicsEngine) return;

      const graphicClip = allShapeClips.find((sc) => sc.id === clipId);
      if (!graphicClip) return;

      const oldDuration = graphicClip.duration;
      const newDuration =
        edge === "left"
          ? Math.max(
              0.1,
              graphicClip.startTime + graphicClip.duration - newTime,
            )
          : Math.max(0.1, newTime - graphicClip.startTime);

      const updates =
        edge === "left"
          ? {
              startTime: newTime,
              duration: newDuration,
            }
          : {
              duration: newDuration,
            };

      const adjustedKeyframes = graphicClip.keyframes.map((kf) => {
        if (kf.id.startsWith("kf-exit-")) {
          const relativeTime = kf.time - oldDuration;
          return { ...kf, time: newDuration + relativeTime };
        }
        return kf;
      });

      if (graphicClip.type === "sticker" || graphicClip.type === "emoji") {
        graphicsEngine.updateStickerClip(clipId, updates);
      } else if (graphicClip.type === "svg") {
        graphicsEngine.updateSVGClip(clipId, updates);
      } else {
        graphicsEngine.updateShapeClip(clipId, updates);
      }

      useProjectStore.getState().updateClipKeyframes(clipId, adjustedKeyframes);

      useProjectStore.setState((state) => ({
        project: { ...state.project, modifiedAt: Date.now() },
      }));
    },
    [graphicsEngine, allShapeClips],
  );

  const handleTrimClip = useCallback(
    (clipId: string, edge: "left" | "right", newTime: number) => {
      const clip = tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
      if (!clip) return;

      const oldDuration = clip.duration;
      const newDuration =
        edge === "left"
          ? Math.max(0.1, clip.startTime + clip.duration - newTime)
          : Math.max(0.1, newTime - clip.startTime);

      const updates =
        edge === "left"
          ? {
              startTime: newTime,
              duration: newDuration,
            }
          : {
              duration: newDuration,
            };

      const adjustedKeyframes = clip.keyframes.map((kf) => {
        if (kf.id.startsWith("kf-exit-")) {
          const relativeTime = kf.time - oldDuration;
          return { ...kf, time: newDuration + relativeTime };
        }
        return kf;
      });

      useProjectStore.setState((state) => ({
        project: {
          ...state.project,
          timeline: {
            ...state.project.timeline,
            tracks: state.project.timeline.tracks.map((track) => ({
              ...track,
              clips: track.clips.map((c) =>
                c.id === clipId
                  ? { ...c, ...updates, keyframes: adjustedKeyframes }
                  : c,
              ),
            })),
          },
          modifiedAt: Date.now(),
        },
      }));
    },
    [tracks],
  );

  const visualOrderTracks = useMemo(() => tracks, [tracks]);

  return (
    <div
      data-tour="timeline"
      className="h-full bg-background border-t border-border flex flex-col"
    >
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-background-secondary relative z-[100]">
        <div className="flex items-center gap-2">
          <div className="flex bg-background-tertiary rounded-lg p-1 border border-border">
            <IconButton
              icon={Undo2}
              onClick={undo}
              disabled={!canUndo()}
              title="Undo (Cmd+Z)"
            />
            <IconButton
              icon={Redo2}
              onClick={redo}
              disabled={!canRedo()}
              title="Redo (Cmd+Shift+Z)"
            />
          </div>

        </div>

        <div className="font-mono text-primary text-sm font-bold tracking-wider bg-background-tertiary px-4 py-1.5 rounded-lg border border-primary/20 shadow-[0_0_12px_rgba(34,197,94,0.15)]">
          {formatTimecode(playheadPosition)}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-background-tertiary rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => { setTrackHeight(80); useTimelineStore.setState({ trackHeights: {} }); }}
              className={`w-8 h-8 flex items-center justify-center transition-colors border-r border-border ${
                trackHeight >= 60
                  ? "text-primary bg-primary/10"
                  : "text-text-secondary hover:text-text-primary hover:bg-background-elevated"
              }`}
              title="Large tracks"
            >
              <Rows3 size={14} />
            </button>
            <button
              onClick={() => { setTrackHeight(50); useTimelineStore.setState({ trackHeights: {} }); }}
              className={`w-8 h-8 flex items-center justify-center transition-colors ${
                trackHeight < 60
                  ? "text-primary bg-primary/10"
                  : "text-text-secondary hover:text-text-primary hover:bg-background-elevated"
              }`}
              title="Small tracks"
            >
              <Rows2 size={14} />
            </button>
          </div>
          <div className="flex items-center bg-background-tertiary rounded-lg border border-border overflow-hidden">
            <button
              onClick={zoomOut}
              className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-background-elevated transition-colors border-r border-border"
              title="Zoom out"
            >
              <span className="text-base font-medium">−</span>
            </button>
            <span className="text-[11px] w-14 text-center font-mono text-text-secondary tabular-nums">
              {Math.round(pixelsPerSecond)}px/s
            </span>
            <button
              onClick={zoomIn}
              className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-background-elevated transition-colors border-l border-border"
              title="Zoom in"
            >
              <span className="text-base font-medium">+</span>
            </button>
          </div>
          <IconButton
            icon={X}
            onClick={() => setPanelVisible("timeline", false)}
            title="Hide timeline"
          />
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 flex flex-col overflow-hidden relative"
        onClick={handleBackgroundClick}
      >
        <div className="flex shrink-0">
          <div className="w-32 h-8 bg-background-tertiary border-b border-r border-border shrink-0" />
          <div className="flex-1 overflow-hidden relative">
            <div
              style={{
                width: `${timelineDuration * pixelsPerSecond}px`,
                transform: `translateX(-${scrollX}px)`,
                position: "relative",
              }}
            >
              <TimeRuler
                duration={timelineDuration}
                pixelsPerSecond={pixelsPerSecond}
                scrollX={scrollX}
                viewportWidth={viewportWidth}
                onSeek={(time) => {
                  const bridge = getPlaybackBridge();
                  bridge.scrubTo(time);
                }}
                onScrubStart={() => {
                  const bridge = getPlaybackBridge();
                  bridge.startScrubbing();
                }}
                onScrubEnd={() => {
                  const bridge = getPlaybackBridge();
                  bridge.endScrubbing();
                }}
              />
              {playDurationOverride !== undefined && playDurationOverride > 0 && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: `${playDurationOverride * pixelsPerSecond}px`,
                    width: 0,
                    borderLeft: "1px dashed rgba(34,197,94,0.8)",
                  }}
                  title={`Layout ends at ${playDurationOverride}s`}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-32 bg-background-secondary border-r border-border shrink-0 z-20 shadow-lg overflow-hidden">
            <div
              className="flex flex-col pb-72"
              style={{ transform: `translateY(-${scrollY}px)` }}
            >
              {visualOrderTracks.map((track, i) => {
                const keyframeCount = track.clips.reduce(
                  (sum, clip) => sum + (clip.keyframes?.length || 0),
                  0
                );
                return (
                  <div
                    key={track.id}
                    className={draggedTrackId === track.id ? "opacity-50" : ""}
                  >
                    <TrackHeader
                      track={track}
                      index={i}
                      onDragStart={handleTrackDragStart}
                      onDragOver={handleTrackDragOver}
                      onDrop={handleTrackDrop}
                      keyframeCount={keyframeCount}
                    />
                  </div>
                );
              })}
              {widgets.map((widget) => {
                const color = widgetColorMap[widget.type] ?? defaultWidgetColor;
                return (
                  <div
                    key={widget.id}
                    className="h-14 px-3 border-b border-border/60 flex items-center gap-2 bg-background-secondary/20"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color.blockBg }}
                      aria-hidden
                    />
                    <span className="truncate text-xs font-medium text-text-secondary">
                      {widgetDisplayName(widget.type)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            ref={tracksRef}
            className="flex-1 bg-background relative overflow-auto custom-scrollbar"
            onScroll={(e) => {
              setScrollX(e.currentTarget.scrollLeft);
              setScrollY(e.currentTarget.scrollTop);
            }}
            onMouseDown={handleBoxSelectionStart}
            onMouseMove={handleBoxSelectionMove}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={async (e) => {
              e.preventDefault();

              const rect = tracksRef.current?.getBoundingClientRect();
              if (!rect) return;
              const x = e.clientX - rect.left + (tracksRef.current?.scrollLeft ?? 0);
              const rawTime = Math.max(0, x / pixelsPerSecond);

              const allClips = project.timeline.tracks.flatMap(t => t.clips);
              let snappedTime = rawTime;
              if (snapSettings.enabled) {
                const threshold = snapSettings.snapThreshold / pixelsPerSecond;
                let bestDist = Infinity;
                for (const clip of allClips) {
                  const clipEnd = clip.startTime + clip.duration;
                  const distToEnd = Math.abs(rawTime - clipEnd);
                  const distToStart = Math.abs(rawTime - clip.startTime);
                  if (distToEnd < threshold && distToEnd < bestDist) {
                    bestDist = distToEnd;
                    snappedTime = clipEnd;
                  }
                  if (distToStart < threshold && distToStart < bestDist) {
                    bestDist = distToStart;
                    snappedTime = clip.startTime;
                  }
                }
                if (snapSettings.snapToPlayhead) {
                  const distToPlayhead = Math.abs(rawTime - playheadPosition);
                  if (distToPlayhead < threshold && distToPlayhead < bestDist) {
                    snappedTime = playheadPosition;
                  }
                }
              }

              // External OS file drop (e.g. from Windows Explorer)
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const { importMedia, addClipToNewTrack } = useProjectStore.getState();
                for (const file of Array.from(e.dataTransfer.files)) {
                  try {
                    const beforeIds = new Set(
                      useProjectStore.getState().project.mediaLibrary.items.map(i => i.id)
                    );
                    const result = await importMedia(file);
                    if (result.success) {
                      const newItem = useProjectStore
                        .getState()
                        .project.mediaLibrary.items.find(i => !beforeIds.has(i.id));
                      if (newItem) {
                        await addClipToNewTrack(newItem.id, snappedTime);
                        const track = useProjectStore
                          .getState()
                          .project.timeline.tracks.find(t =>
                            t.clips.some(c => c.mediaId === newItem.id)
                          );
                        if (track) {
                          toast.success(`Added to ${track.name}`, file.name);
                        }
                      }
                    }
                  } catch (err) {
                    console.error("[Timeline] External file drop failed:", err);
                  }
                }
                return;
              }

              // Dragged signage widget from signage toolbar
              const signageType = e.dataTransfer.getData("application/signage-widget");
              if (signageType) {
                addWidget({
                  id: uuidv4(),
                  type: signageType as SignageWidgetType,
                  startTime: snappedTime,
                  duration: 10,
                  config: cloneDefaultWidgetConfig(signageType as SignageWidgetType),
                  locked: false,
                  hidden: false,
                  layout: { x: 40, y: 40, width: 360, height: 220 },
                });
                return;
              }

              // Internal drag from assets panel
              try {
                const rawData = e.dataTransfer.getData("application/json");
                if (!rawData) return;
                const data = JSON.parse(rawData);
                if (!data?.mediaId) return;
                handleDropMedia("", data.mediaId, snappedTime);
              } catch {
                // ignore
              }
            }}
          >
            <div
              style={{ width: `${timelineDuration * pixelsPerSecond}px`, position: "relative" }}
              className="min-w-full pb-72"
            >
              {playDurationOverride !== undefined && playDurationOverride > 0 && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-10"
                  style={{
                    left: `${playDurationOverride * pixelsPerSecond}px`,
                    width: 0,
                    borderLeft: "1px dashed rgba(34,197,94,0.7)",
                  }}
                />
              )}
              {visualOrderTracks.map((track) => (
                <TrackLane
                  key={track.id}
                  track={track}
                  allTracks={visualOrderTracks}
                  pixelsPerSecond={pixelsPerSecond}
                  selectedClipIds={selectedClipIds}
                  textClips={getTextClipsForTrack(track.id)}
                  shapeClips={getShapeClipsForTrack(track.id)}
                  trackHeights={trackHeightsMap}
                  timelineRef={tracksRef}
                  onSelectClip={handleSelectClip}
                  onDropMedia={handleDropMedia}
                  onMoveClip={handleMoveClip}
                  onSnapIndicator={handleSnapIndicator}
                  onTrimClip={
                    track.type === "video" ||
                    track.type === "image" ||
                    track.type === "audio"
                      ? handleTrimClip
                      : undefined
                  }
                  onTrimTextClip={handleTrimTextClip}
                  onMoveTextClip={handleMoveTextClip}
                  onTrimShapeClip={handleTrimShapeClip}
                  scrollX={scrollX}
                  trackHeight={getTrackHeight(track.id)}
                  onResizeTrack={setTrackHeightById}
                  onKeyframeSelect={handleKeyframeSelect}
                  onKeyframeMove={handleKeyframeMove}
                  onKeyframeDelete={handleKeyframeDelete}
                  selectedKeyframeIds={selectedKeyframeIds}
                />
              ))}

              {widgets.map((widget) => {
                const blockLeft = widget.startTime * pixelsPerSecond;
                const blockWidth = Math.max(40, widget.duration * pixelsPerSecond);
                const isSelected = selectedWidgetId === widget.id;
                const isLocked = Boolean(widget.locked);
                const isHidden = Boolean(widget.hidden);
                const color = widgetColorMap[widget.type] ?? defaultWidgetColor;
                return (
                  <div
                    key={widget.id}
                    className="group relative h-14 border-b border-border/60 bg-background-secondary/10"
                  >
                    <ContextMenu
                      onOpenChange={(open) => {
                        if (open) select({ type: "widget", id: widget.id });
                      }}
                    >
                      <ContextMenuTrigger asChild>
                        <button
                          className="absolute top-2 h-10 overflow-hidden rounded-lg text-left shadow-sm transition-all"
                          style={{
                            left: blockLeft,
                            width: blockWidth,
                            background: `linear-gradient(135deg, ${color.blockBg}cc 0%, ${color.blockBg}66 100%)`,
                            color: color.text,
                            opacity: isHidden ? 0.4 : 1,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            select({ type: "widget", id: widget.id });
                          }}
                          onContextMenu={(e) => e.stopPropagation()}
                          onMouseDown={(e) => {
                            if (isLocked) return;
                            e.stopPropagation();
                            setDraggingWidgetId(widget.id);
                            setDragOffsetSeconds(
                              e.nativeEvent.offsetX / Math.max(1, pixelsPerSecond),
                            );
                          }}
                        >
                          <span className="flex h-full items-center gap-1 px-2.5">
                            <span className="truncate text-xs font-medium drop-shadow-sm">
                              {widgetDisplayName(widget.type)}
                            </span>
                            {isLocked && (
                              <span className="text-[10px] opacity-90">🔒</span>
                            )}
                            {isHidden && (
                              <span className="text-[10px] opacity-90">🙈</span>
                            )}
                          </span>
                          {isSelected && (
                            <span className="pointer-events-none absolute inset-0 rounded-lg border-2 border-primary shadow-[inset_0_0_10px_rgba(34,197,94,0.25)]" />
                          )}
                        </button>
                      </ContextMenuTrigger>
                      <WidgetContextMenu widget={widget} />
                    </ContextMenu>
                    <div
                      className="absolute top-2 h-10 w-2 cursor-ew-resize rounded-l bg-white/20 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/50"
                      style={{ left: Math.max(0, blockLeft - 1) }}
                      onMouseDown={(e) => {
                        if (isLocked) return;
                        e.stopPropagation();
                        select({ type: "widget", id: widget.id });
                        setResizingWidget({ id: widget.id, edge: "start" });
                      }}
                    />
                    <div
                      className="absolute top-2 h-10 w-2 cursor-ew-resize rounded-r bg-white/20 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/50"
                      style={{ left: blockLeft + blockWidth - 7 }}
                      onMouseDown={(e) => {
                        if (isLocked) return;
                        e.stopPropagation();
                        select({ type: "widget", id: widget.id });
                        setResizingWidget({ id: widget.id, edge: "end" });
                      }}
                    />
                  </div>
                );
              })}

              <BeatMarkerOverlay
                pixelsPerSecond={pixelsPerSecond}
                scrollX={scrollX}
                viewportWidth={viewportWidth}
                totalHeight={totalTracksHeight}
              />

              {project.timeline.markers.map((marker) => (
                <MarkerIndicator
                  key={marker.id}
                  marker={marker}
                  pixelsPerSecond={pixelsPerSecond}
                  scrollX={scrollX}
                  onSeek={(time) => {
                    const bridge = getPlaybackBridge();
                    bridge.scrubTo(time);
                  }}
                  onRemove={removeMarker}
                  onUpdate={updateMarker}
                />
              ))}

              {snapIndicatorTime !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-yellow-400 z-30 pointer-events-none"
                  style={{ left: `${snapIndicatorTime * pixelsPerSecond}px` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full" />
                </div>
              )}

              {isBoxSelecting && selectionBox && (
                <div
                  className="absolute border-2 border-primary bg-primary/10 pointer-events-none z-40"
                  style={{
                    left:
                      Math.min(selectionBox.startX, selectionBox.currentX) -
                      scrollX,
                    top:
                      Math.min(selectionBox.startY, selectionBox.currentY) -
                      scrollY,
                    width: Math.abs(
                      selectionBox.currentX - selectionBox.startX,
                    ),
                    height: Math.abs(
                      selectionBox.currentY - selectionBox.startY,
                    ),
                  }}
                />
              )}

            </div>
          </div>
        </div>

        <Playhead
          position={playheadPosition}
          pixelsPerSecond={pixelsPerSecond}
          scrollX={scrollX}
          headerOffset={128}
        />
      </div>
    </div>
  );
};

export default Timeline;
