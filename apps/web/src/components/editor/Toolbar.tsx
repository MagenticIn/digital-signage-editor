import React, { useCallback, useState } from "react";
import {
  ArrowLeft,
  Film,
  Sun,
  Moon,
  SunMoon,
  X,
  History,
  Download,
  Eye,
  PanelsTopLeft,
  Save,
  Upload,
  Loader2,
} from "lucide-react";
import { useProjectStore } from "../../stores/project-store";
import { useUIStore } from "../../stores/ui-store";
import { useThemeStore } from "../../stores/theme-store";
import { useTimelineStore } from "../../stores/timeline-store";
import { useSignageWidgetStore, migrateWidget } from "../../stores/signage-widget-store";
import { useRouter } from "../../hooks/use-router";
import { AgeruWordmark } from "../AgeruWordmark";
import { HistoryPanel } from "./inspector/HistoryPanel";
import { toast } from "../../stores/notification-store";
import { saveSignageLayout, publishSignageLayout } from "../../services/signage-layouts-api";
import { writePreviewSnapshot } from "../../services/preview-snapshot";
import {
  openPreviewChannel,
  type PreviewSnapshotMessage,
  type PreviewSyncMessage,
} from "../../services/preview-sync";
import { getEffectiveProjectDuration } from "@openreel/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@openreel/ui";
import type { Project } from "@openreel/core";

function stripForSignageSave(project: Project): Project {
  return {
    ...project,
    mediaLibrary: {
      items: project.mediaLibrary.items.map((item) => ({
        ...item,
        blob: null,
        fileHandle: null,
        waveformData: null,
      })),
    },
  };
}

export const Toolbar: React.FC = () => {
  const { project } = useProjectStore();
  const forceSave = useProjectStore((state) => state.forceSave);
  const panels = useUIStore((s) => s.panels);
  const togglePanel = useUIStore((s) => s.togglePanel);
  const { mode: themeMode, toggleTheme } = useThemeStore();
  const { navigate, params } = useRouter();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  /**
   * Snapshot used for both Download (full payload) and Preview (live channel).
   * Centralized so Preview is always replaying exactly what Download serializes.
   *
   * - Settings are normalized: every optional ProjectSettings field is
   *   emitted with its effective value (so the payload is self-contained).
   * - Widgets are migrated so every config field is present (legacy widgets
   *   get their newer fields back-filled with defaults).
   * - `effectiveDuration` is exposed explicitly for the replayer.
   */
  const buildPreviewCorePayload = useCallback(() => {
    const rawWidgets = useSignageWidgetStore.getState().widgets;
    const signageWidgets = rawWidgets.map(migrateWidget);
    const autoDuration = getEffectiveProjectDuration(project);
    const widgetMaxEnd = signageWidgets.reduce(
      (m, w) => Math.max(m, w.startTime + w.duration),
      0,
    );
    const effectiveDuration = Math.max(autoDuration, widgetMaxEnd, 0);

    const normalizedProject = {
      ...project,
      settings: {
        ...project.settings,
        backgroundColor: project.settings.backgroundColor ?? "rgba(0,0,0,1)",
        playDuration: project.settings.playDuration ?? effectiveDuration,
        placeholderText:
          project.settings.placeholderText ?? "Import media to get started",
        placeholderTextColor:
          project.settings.placeholderTextColor ?? "rgba(161,161,170,1)",
        placeholderFontSize: project.settings.placeholderFontSize ?? 24,
      },
      timeline: {
        ...project.timeline,
        duration: Math.max(project.timeline.duration, widgetMaxEnd),
      },
    };

    return {
      exportedAt: new Date().toISOString(),
      project: normalizedProject,
      signageWidgets,
      effectiveDuration,
    };
  }, [project]);

  const handleDownloadEditorState = useCallback(() => {
    const timestamp = new Date()
      .toISOString()
      .replace(/\.\d{3}Z$/, "")
      .replace(/:/g, "-");
    const filename = `editor-state-${timestamp}.json`;
    const corePayload = buildPreviewCorePayload();
    const payload = {
      ...corePayload,
      timeline: {
        playheadPosition: useTimelineStore.getState().playheadPosition,
        playbackState: useTimelineStore.getState().playbackState,
        pixelsPerSecond: useTimelineStore.getState().pixelsPerSecond,
      },
      ui: {
        selectedItems: useUIStore.getState().selectedItems,
        panels: useUIStore.getState().panels,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success("Editor state downloaded", filename);
  }, [buildPreviewCorePayload]);

  const handleOpenPreview = useCallback(() => {
    writePreviewSnapshot(buildPreviewCorePayload());
    // The router parses params from the hash (#/route?key=val), not the URL query.
    const url = new URL(window.location.href);
    url.hash = "#/editor?fullscreen=1";
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }, [buildPreviewCorePayload]);

  // Live broadcast: any time the editor's project or widgets change, push the
  // normalized snapshot to all open Preview tabs over a BroadcastChannel. Also
  // respond to "request-snapshot" pings (preview tab reload).
  React.useEffect(() => {
    const channel = openPreviewChannel();
    if (!channel) return;

    let debounce: number | null = null;
    const broadcast = () => {
      if (debounce != null) window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        const payload = buildPreviewCorePayload();
        const msg: PreviewSnapshotMessage = {
          type: "snapshot",
          project: payload.project,
          signageWidgets: payload.signageWidgets,
          effectiveDuration: payload.effectiveDuration,
          ts: Date.now(),
        };
        try { channel.postMessage(msg); } catch { /* ignore */ }
      }, 200);
    };

    // Broadcast whenever the project store or widget store changes.
    // `useProjectStore` has subscribeWithSelector middleware so we can target
    // the `.project` slice; the widget store is plain Zustand and we just
    // broadcast on any state change (only `widgets` lives there anyway).
    const unsubProject = useProjectStore.subscribe(
      (state) => state.project,
      () => broadcast(),
    );
    const unsubWidgets = useSignageWidgetStore.subscribe(() => broadcast());

    const onMessage = (event: MessageEvent<PreviewSyncMessage>) => {
      if (event.data?.type === "request-snapshot") broadcast();
    };
    channel.addEventListener("message", onMessage);

    // Initial push so a preview tab opened before this effect mounted sees data.
    broadcast();

    return () => {
      if (debounce != null) window.clearTimeout(debounce);
      channel.removeEventListener("message", onMessage);
      unsubProject();
      unsubWidgets();
      channel.close();
    };
  }, [buildPreviewCorePayload]);

  const returnUrl = params.returnUrl?.trim() || "";
  const isIntegratedSession = Boolean(returnUrl);
  const signageLayoutId = params.signageLayoutId?.trim() || "";
  const isSignageSession = params.integration === "digital-signage" && Boolean(signageLayoutId);

  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [isPublishingLayout, setIsPublishingLayout] = useState(false);

  const handleSaveLayout = useCallback(async () => {
    if (!signageLayoutId) return;
    setIsSavingLayout(true);
    try {
      const currentProject = stripForSignageSave(useProjectStore.getState().getFullProject());
      await saveSignageLayout(signageLayoutId, {
        layoutJson: currentProject as unknown as Record<string, unknown>,
        isValid: true,
      });
      toast.success("Layout saved", "Your changes were saved to the signage library.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save layout.";
      toast.error("Save failed", message);
    } finally {
      setIsSavingLayout(false);
    }
  }, [signageLayoutId]);

  const handlePublishLayout = useCallback(async () => {
    if (!signageLayoutId) return;
    setIsPublishingLayout(true);
    try {
      const currentProject = stripForSignageSave(useProjectStore.getState().getFullProject());
      await saveSignageLayout(signageLayoutId, {
        layoutJson: currentProject as unknown as Record<string, unknown>,
        isValid: true,
      });
      await publishSignageLayout(signageLayoutId);
      toast.success("Layout published", "Layout is now live and available to devices.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to publish layout.";
      toast.error("Publish failed", message);
    } finally {
      setIsPublishingLayout(false);
    }
  }, [signageLayoutId]);

  const closeIntegratedSession = useCallback(() => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "OPENREEL_CLOSE_EDITOR", source: "openreel-video" }, "*");
      return;
    }
    if (returnUrl) {
      window.location.href = returnUrl;
      return;
    }
    navigate("welcome");
  }, [navigate, returnUrl]);

  const handleBackToHost = useCallback(() => {
    if (!isIntegratedSession) {
      navigate("welcome");
      return;
    }
    setIsExitDialogOpen(true);
  }, [isIntegratedSession, navigate]);

  const handleSaveDraftAndClose = useCallback(async () => {
    setIsSavingDraft(true);
    try {
      await forceSave();
      toast.success("Draft saved", "Your latest changes were saved before exit.");
      setIsExitDialogOpen(false);
      closeIntegratedSession();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save draft.";
      toast.error("Could not save draft", message);
    } finally {
      setIsSavingDraft(false);
    }
  }, [closeIntegratedSession, forceSave]);

  const handleDiscardAndClose = useCallback(() => {
    setIsExitDialogOpen(false);
    closeIntegratedSession();
  }, [closeIntegratedSession]);

  return (
    <div className="h-16 border-b border-border flex items-center px-6 justify-between bg-background shrink-0 z-30 relative">
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate("welcome")}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              title="Back to Home"
            >
              <Film size={24} className="text-primary" />
              <AgeruWordmark className="text-lg font-medium text-text-primary tracking-wide hidden lg:inline-flex" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Back to Home</TooltipContent>
        </Tooltip>
        {isIntegratedSession ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleBackToHost}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-background-elevated hover:text-text-primary"
                title="Back to Digital Signage"
              >
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">Back</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Back to Digital Signage</TooltipContent>
          </Tooltip>
        ) : null}
        <div className="h-6 w-px bg-border hidden md:block" />

        <div className="hidden sm:flex items-center gap-0.5 pl-1">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-2 rounded-lg transition-colors text-text-secondary hover:bg-background-elevated hover:text-text-primary"
                  >
                    <PanelsTopLeft size={16} />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show / hide panels</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Panels</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={panels.mediaLibrary?.visible ?? true}
                onCheckedChange={() => togglePanel("mediaLibrary")}
              >
                Asset panel
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={panels.inspector?.visible ?? true}
                onCheckedChange={() => togglePanel("inspector")}
              >
                Inspector
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={panels.timeline?.visible ?? true}
                onCheckedChange={() => togglePanel("timeline")}
              >
                Timeline
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1" />

      {isSignageSession ? (
        <div className="flex items-center gap-2 mr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => void handleSaveLayout()}
                disabled={isSavingLayout || isPublishingLayout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-background-elevated hover:text-text-primary disabled:opacity-50"
              >
                {isSavingLayout ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span className="hidden sm:inline">Save</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Save layout to digital signage</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => void handlePublishLayout()}
                disabled={isSavingLayout || isPublishingLayout}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isPublishingLayout ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                <span className="hidden sm:inline">Publish</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Save and publish layout to devices</TooltipContent>
          </Tooltip>
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleOpenPreview}
              className="p-2 rounded-lg hover:bg-background-elevated text-text-secondary hover:text-text-primary transition-colors"
            >
              <Eye size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Open full-screen preview in a new tab</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleDownloadEditorState}
              className="p-2 rounded-lg hover:bg-background-elevated text-text-secondary hover:text-text-primary transition-colors"
            >
              <Download size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Download editor state JSON</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-background-elevated text-text-secondary hover:text-text-primary transition-colors"
            >
              {themeMode === "light" ? (
                <Sun size={16} />
              ) : themeMode === "dark" ? (
                <Moon size={16} />
              ) : (
                <SunMoon size={16} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Theme: {themeMode}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`p-2 rounded-lg transition-colors ${
                isHistoryOpen
                  ? "bg-primary/20 text-primary"
                  : "hover:bg-background-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              <History size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>History - Undo/Redo</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Dialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Leave editor?</DialogTitle>
            <DialogDescription>
              Save your current work as a draft before closing, or discard these changes.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setIsExitDialogOpen(false)} disabled={isSavingDraft}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleDiscardAndClose} disabled={isSavingDraft}>
              Discard
            </Button>
            <Button onClick={() => void handleSaveDraftAndClose()} disabled={isSavingDraft}>
              {isSavingDraft ? "Saving..." : "Save as draft"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isHistoryOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsHistoryOpen(false)}
          />
          <div className="fixed top-16 right-0 bottom-0 w-80 bg-background-secondary border-l border-border z-50 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <span className="text-sm font-medium text-text-primary">Action History</span>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 rounded hover:bg-background-tertiary text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="h-[calc(100%-49px)]">
              <HistoryPanel />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Toolbar;
