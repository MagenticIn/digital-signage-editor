import { useEffect, useCallback, useRef, lazy, Suspense, useState } from "react";
import { ToastContainer } from "./components/Toast";
import { ScriptViewDialog } from "./components/editor/ScriptViewDialog";
import { SearchModal } from "./components/editor/SearchModal";
import { MobileBlocker } from "./components/MobileBlocker";
import { WelcomeScreen } from "./components/welcome";
import { RecoveryDialog } from "./components/welcome/RecoveryDialog";
import { SharePage } from "./pages/SharePage";
import { useUIStore } from "./stores/ui-store";
import { useProjectStore } from "./stores/project-store";
import { useRouter } from "./hooks/use-router";
import { useProjectRecovery } from "./hooks/useProjectRecovery";

import { SOCIAL_MEDIA_PRESETS, type SocialMediaCategory, type Project } from "@openreel/core";
import { TooltipProvider } from "@openreel/ui";

function isEditorProjectShape(data: unknown): data is Project {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.settings === "object" && d.settings !== null &&
    typeof d.mediaLibrary === "object" && d.mediaLibrary !== null &&
    typeof d.timeline === "object" && d.timeline !== null &&
    Array.isArray((d.timeline as Record<string, unknown>).tracks)
  );
}
import { setSignageAuth, getSignageLayout, isSignageLayoutsConnected } from "./services/signage-layouts-api";
import { useSignageMediaStore } from "./stores/signage-media-store";

const EditorInterface = lazy(() =>
  import("./components/editor/EditorInterface").then((m) => ({
    default: m.EditorInterface,
  }))
);

const LoadingSpinner: React.FC<{ message: string }> = ({ message }) => (
  <div className="h-screen w-screen bg-background flex flex-col items-center justify-center">
    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
    <p className="text-sm text-text-secondary">{message}</p>
  </div>
);

const PRESET_DIMENSIONS: Record<string, SocialMediaCategory> = {
  "1080x1920": "tiktok",
  "1920x1080": "youtube-video",
  "1080x1080": "instagram-post",
  "720x1280": "instagram-stories",
  "1280x720": "youtube-video",
};

function App() {
  const { activeModal, closeModal, skipWelcomeScreen } = useUIStore();
  const { openModal: openSearchModal } = useUIStore();
  const createNewProject = useProjectStore((state) => state.createNewProject);
  const loadProject = useProjectStore((state) => state.loadProject);
  const { showDialog, availableSaves, recover, dismiss, clearAll } = useProjectRecovery();

  const { route, params, navigate, parsedDimensions, fps } = useRouter();
  const hasHandledInitialRoute = useRef(false);
  const signageLayoutLoadedRef = useRef(false);

  // Track whether we are still fetching the signage layout before showing the editor.
  const [signageLoading, setSignageLoading] = useState(false);
  const [signageLoadError, setSignageLoadError] = useState<string | null>(null);


  // ---------------------------------------------------------------------------
  // Signal opener that the editor is ready to receive SIGNAGE_INIT.
  // The dashboard retries SIGNAGE_INIT until it sees OPENREEL_EDITOR_READY back.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (window.opener) {
      try {
        window.opener.postMessage({ type: "OPENREEL_EDITOR_READY" }, "*");
      } catch { /* cross-origin opener blocked */ }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Cross-origin auth bridge: listen for SIGNAGE_INIT from the digital-signage
  // host page and write token/apiUrl into localStorage so the layout APIs work.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as Record<string, unknown> | null;
      if (!data || data.type !== "SIGNAGE_INIT") return;
      const { token, apiUrl } = data as { token?: string; apiUrl?: string };
      if (token && apiUrl) {
        setSignageAuth(token, apiUrl);
        // ACK so the parent stops retrying
        try {
          if (window.opener) window.opener.postMessage({ type: "SIGNAGE_INIT_ACK" }, "*");
        } catch { /* blocked */ }
        // Re-check the media store connection so the Library tab activates.
        const mediaStore = useSignageMediaStore.getState();
        mediaStore.checkConnection();
        if (useSignageMediaStore.getState().connected) {
          void mediaStore.fetchItems();
          void mediaStore.fetchQuota();
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ---------------------------------------------------------------------------
  // Signage layout loader: when the editor opens in digital-signage integration
  // mode, fetch the layout from the API and seed the project store with it.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (signageLayoutLoadedRef.current) return;
    if (params.integration !== "digital-signage") return;
    if (!params.signageLayoutId) return;
    if (route !== "editor") return;

    signageLayoutLoadedRef.current = true;

    const load = async () => {
      setSignageLoading(true);
      setSignageLoadError(null);
      try {
        // Auth may not be in localStorage yet (cross-origin iframe case).
        // Wait briefly for the SIGNAGE_INIT postMessage to arrive and set it.
        if (!isSignageLayoutsConnected()) {
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(resolve, 2000);
            const onMsg = (ev: MessageEvent) => {
              const d = ev.data as Record<string, unknown> | null;
              if (d?.type === "SIGNAGE_INIT") {
                clearTimeout(timeout);
                window.removeEventListener("message", onMsg);
                resolve();
              }
            };
            window.addEventListener("message", onMsg);
          });
        }

        const layout = await getSignageLayout(params.signageLayoutId!);
        if (isEditorProjectShape(layout.layoutJson)) {
          loadProject(layout.layoutJson);
        } else {
          // layoutJson was created outside the editor (e.g. dashboard "Create layout" form).
          // Leave the store's empty Project in place and optionally adopt the layout's canvas size.
          console.info("[Signage] Layout has no editor project state yet; starting from an empty timeline");
          const canvas = (layout.layoutJson as Record<string, unknown> | null)?.canvas as
            | Record<string, unknown>
            | undefined;
          if (canvas && typeof canvas.width === "number" && typeof canvas.height === "number") {
            await useProjectStore.getState().updateSettings({
              width: canvas.width,
              height: canvas.height,
            });
          }
        }
        // In preview mode: hide all editing panels so only the canvas is visible.
        if (params.preview === "1") {
          const { setPanelVisible } = useUIStore.getState();
          setPanelVisible("mediaLibrary", false);
          setPanelVisible("inspector", false);
          setPanelVisible("timeline", false);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load layout.";
        setSignageLoadError(msg);
        console.error("[Signage] Failed to load layout:", err);
      } finally {
        setSignageLoading(false);
      }
    };

    void load();
  }, [params.integration, params.signageLayoutId, route, loadProject]);

  useEffect(() => {
    if (hasHandledInitialRoute.current) return;

    if (route === "new") {
      hasHandledInitialRoute.current = true;

      let projectName = "New Project";
      let width = 1920;
      let height = 1080;
      let frameRate = fps;

      if (params.preset) {
        const presetKey = params.preset as SocialMediaCategory;
        const preset = SOCIAL_MEDIA_PRESETS[presetKey];
        if (preset) {
          width = preset.width;
          height = preset.height;
          frameRate = preset.frameRate || fps;
          projectName = `New ${presetKey.charAt(0).toUpperCase() + presetKey.slice(1).replace(/-/g, " ")} Project`;
        }
      } else if (parsedDimensions) {
        width = parsedDimensions.width;
        height = parsedDimensions.height;

        const dimensionKey = `${width}x${height}`;
        const matchingPreset = PRESET_DIMENSIONS[dimensionKey];
        if (matchingPreset) {
          const preset = SOCIAL_MEDIA_PRESETS[matchingPreset];
          frameRate = preset.frameRate || fps;
        }

        const aspectRatio = width / height;
        if (aspectRatio < 1) {
          projectName = "New Vertical Video";
        } else if (aspectRatio > 1) {
          projectName = "New Horizontal Video";
        } else {
          projectName = "New Square Video";
        }
      }

      createNewProject(projectName, { width, height, frameRate });
      navigate("editor");
    } else if (route === "editor" && skipWelcomeScreen) {
      hasHandledInitialRoute.current = true;
    } else if (["welcome", "templates", "recent"].includes(route)) {
      hasHandledInitialRoute.current = true;
    }
  }, [
    route,
    params,
    parsedDimensions,
    fps,
    createNewProject,
    navigate,
    skipWelcomeScreen,
  ]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && route !== "editor") {
        navigate("editor");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearchModal("search");
      }
    },
    [route, navigate, openSearchModal],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const showWelcome =
    ["welcome", "templates", "recent"].includes(route) && !skipWelcomeScreen;
  const initialTab =
    route === "templates"
      ? "templates"
      : route === "recent"
        ? "recent"
        : undefined;
  const isSharePage = route === "share" && params.shareId;
  const isSignageSession =
    params.integration === "digital-signage" && Boolean(params.signageLayoutId);

  return (
    <TooltipProvider>
      <div className="h-screen w-screen bg-background text-text-primary overflow-hidden">
        <MobileBlocker />
        {isSharePage ? (
          <SharePage shareId={params.shareId!} />
        ) : showWelcome ? (
          <WelcomeScreen initialTab={initialTab} />
        ) : signageLoading ? (
          <LoadingSpinner message="Loading layout from digital signage…" />
        ) : signageLoadError && isSignageSession ? (
          <div className="h-screen w-screen bg-background flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-sm text-red-400">Could not load layout: {signageLoadError}</p>
            <button
              className="text-sm text-text-secondary underline"
              onClick={() => { setSignageLoadError(null); navigate("editor"); }}
            >
              Continue anyway
            </button>
          </div>
        ) : (
          <Suspense fallback={<LoadingSpinner message="Loading editor..." />}>
            <EditorInterface />
          </Suspense>
        )}
        <ToastContainer />
        <ScriptViewDialog
          isOpen={activeModal === "scriptView"}
          onClose={closeModal}
        />
        <SearchModal isOpen={activeModal === "search"} onClose={closeModal} />
        {showDialog && availableSaves.length > 0 && (
          <RecoveryDialog
            saves={availableSaves}
            onRecover={async (saveId) => {
              const success = await recover(saveId);
              if (success) navigate("editor");
            }}
            onDismiss={dismiss}
            onClearAll={clearAll}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

export default App;
