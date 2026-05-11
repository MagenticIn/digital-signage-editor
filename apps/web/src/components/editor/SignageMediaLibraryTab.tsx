import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Cloud,
  CloudUpload,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  AlertTriangle,
} from "lucide-react";
import {
  useSignageMediaStore,
  resolveSignageAssetUrl,
} from "../../stores/signage-media-store";
import type { SignageMediaItem } from "../../stores/signage-media-store";
import { useProjectStore } from "../../stores/project-store";
import { toast } from "../../stores/notification-store";
import { ScrollArea } from "@openreel/ui";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const val = bytes / 1024 ** idx;
  return `${val.toFixed(val >= 10 ? 0 : 1)} ${units[idx]}`;
};

const formatMb = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  if (mb <= 0) return "0 MB";
  return `${mb >= 1 ? mb.toFixed(1) : mb.toFixed(2)} MB`;
};

// ---------------------------------------------------------------------------
// Quota Bar
// ---------------------------------------------------------------------------

const QuotaBar: React.FC = () => {
  const quota = useSignageMediaStore((s) => s.quota);
  if (!quota) return null;

  const usedPct =
    quota.quotaBytes > 0
      ? Math.min(100, (quota.uploadsUsedBytes / quota.quotaBytes) * 100)
      : 0;

  const barColor =
    usedPct >= 95
      ? "bg-red-500"
      : usedPct >= 80
        ? "bg-yellow-500"
        : "bg-primary";

  return (
    <div className="px-1 py-2 space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <HardDrive size={10} />
          Storage
        </span>
        <span>
          {formatMb(quota.uploadsUsedBytes)} / {formatMb(quota.quotaBytes)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-background-tertiary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${usedPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[9px] text-text-muted">
        <span>{usedPct.toFixed(1)}% used</span>
        <span>{formatMb(quota.remainingBytes)} remaining</span>
      </div>
      {quota.atOrOverQuota && (
        <div className="flex items-center gap-1 text-[9px] text-red-400">
          <AlertTriangle size={10} />
          Storage quota reached
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Media Item Thumbnail
// ---------------------------------------------------------------------------

const LibraryMediaThumbnail: React.FC<{
  item: SignageMediaItem;
  onImport: () => void;
  isImporting: boolean;
}> = ({ item, onImport, isImporting }) => {
  const [hovered, setHovered] = useState(false);
  const isVideo = (item.type ?? "").toLowerCase().startsWith("video/");
  const thumb = resolveSignageAssetUrl(item.thumbnailUrl);

  return (
    <div className="flex flex-col">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="aspect-video bg-background-tertiary rounded-lg border-2 border-border hover:border-text-secondary relative group cursor-pointer transition-all overflow-hidden shadow-sm"
      >
        {thumb ? (
          <img
            src={thumb}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-background-tertiary">
            {isVideo ? (
              <Film size={24} className="text-status-info/50" />
            ) : (
              <ImageIcon size={24} className="text-primary/50" />
            )}
          </div>
        )}

        {/* Size badge */}
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-[9px] text-white font-mono">
          {formatBytes(item.size)}
        </div>

        {/* Hover overlay */}
        {hovered && !isImporting && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center gap-2 animate-in fade-in duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onImport();
              }}
              title="Import to editor"
              className="p-2 bg-primary/20 rounded-full hover:bg-primary/40 backdrop-blur-sm transition-colors"
            >
              <Download size={14} className="text-primary" />
            </button>
          </div>
        )}

        {/* Import spinner */}
        {isImporting && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="mt-1.5 px-0.5">
        <div
          className="text-[10px] truncate font-medium text-text-primary"
          title={item.name}
        >
          {item.name}
        </div>
        <div className="text-[9px] text-text-muted truncate">
          {item.type}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const SignageMediaLibraryTab: React.FC = () => {
  const {
    connected,
    items,
    loading,
    uploading,
    error,
    search,
    page,
    totalPages,
    checkConnection,
    fetchItems,
    fetchQuota,
    uploadFile,
    setSearch,
    setPage,
    refresh,
  } = useSignageMediaStore();

  const importMedia = useProjectStore((s) => s.importMedia);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchInput, setSearchInput] = useState(search);
  const [importingId, setImportingId] = useState<string | null>(null);

  // Initialize connection on mount — also listen for SIGNAGE_INIT arriving
  // after mount (cross-origin iframe case where postMessage lands late).
  useEffect(() => {
    checkConnection();

    const onInit = (ev: MessageEvent) => {
      const d = ev.data as Record<string, unknown> | null;
      if (d?.type === "SIGNAGE_INIT") checkConnection();
    };
    window.addEventListener("message", onInit);
    return () => window.removeEventListener("message", onInit);
  }, [checkConnection]);

  // Fetch items + quota when connected
  useEffect(() => {
    if (connected) {
      void fetchItems();
      void fetchQuota();
    }
  }, [connected, fetchItems, fetchQuota]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== search) {
        setSearch(searchInput.trim());
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput, search, setSearch]);

  // Import a backend item into the local editor
  const handleImport = useCallback(
    async (item: SignageMediaItem) => {
      const fileUrl = resolveSignageAssetUrl(item.fileUrl ?? item.url);
      if (!fileUrl) {
        toast.error("No file URL", "This media item has no downloadable file.");
        return;
      }

      setImportingId(item.id);
      try {
        const response = await fetch(fileUrl, {
          mode: "cors",
          credentials: "omit",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();

        // Determine file name with extension fallback
        let filename = item.originalName ?? item.name;
        if (!/\.\w+$/.test(filename)) {
          const ext =
            item.type?.split("/")[1]?.split(";")[0] ?? "bin";
          filename = `${filename}.${ext}`;
        }

        const file = new File([blob], filename, {
          type: item.type || blob.type,
        });

        const result = await importMedia(file, fileUrl);
        if (result.success) {
          toast.success(
            "Imported from library",
            `${item.name} has been added to your project.`,
          );
        } else {
          toast.error(
            "Import failed",
            result.error?.message ?? "Unknown error",
          );
        }
      } catch (e) {
        toast.error(
          "Import failed",
          e instanceof Error ? e.message : "Could not download the file.",
        );
      } finally {
        setImportingId(null);
      }
    },
    [importMedia],
  );

  // Upload to backend
  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        try {
          await uploadFile(file);
          toast.success("Uploaded", `${file.name} uploaded to media library.`);
        } catch (e) {
          toast.error(
            "Upload failed",
            e instanceof Error ? e.message : "Unknown error",
          );
        }
      }
    },
    [uploadFile],
  );

  // Not connected state
  if (!connected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-background-tertiary border border-border flex items-center justify-center mb-4 shadow-inner">
          <Cloud size={24} className="text-text-muted" />
        </div>
        <p className="text-sm text-text-secondary mb-2 font-medium">
          Not connected to media library
        </p>
        <p className="text-xs text-text-muted mb-4">
          The signage backend is not available. Open this editor from the Digital
          Signage dashboard to enable cloud media.
        </p>
        <button
          onClick={checkConnection}
          className="px-4 py-2 bg-background-elevated hover:bg-background-tertiary border border-border text-text-primary text-xs font-medium rounded-lg transition-all hover:border-primary/50"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search + Upload bar */}
      <div className="px-5 space-y-3 mb-3">
        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search library…"
            className="w-full h-8 pl-8 pr-3 text-xs bg-background-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-primary/10 text-primary border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CloudUpload size={12} />
            )}
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="p-1.5 text-text-muted hover:text-text-secondary rounded-lg hover:bg-background-tertiary transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          onChange={(e) => {
            void handleUpload(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />

        {/* Quota bar */}
        <QuotaBar />
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-[10px] text-red-400">
            <AlertTriangle size={12} />
            {error}
          </div>
        </div>
      )}

      {/* Media Grid */}
      <ScrollArea className="flex-1">
        <div className="px-5 pb-5">
          {loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-text-muted">Loading media…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-background-tertiary border border-border flex items-center justify-center mb-3 shadow-inner">
                <Cloud size={20} className="text-text-muted" />
              </div>
              <p className="text-xs text-text-secondary mb-1 font-medium">
                No media found
              </p>
              <p className="text-[10px] text-text-muted">
                {search
                  ? "Try a different search term."
                  : "Upload media or add it from your signage dashboard."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {items.map((item) => (
                  <LibraryMediaThumbnail
                    key={item.id}
                    item={item}
                    onImport={() => void handleImport(item)}
                    isImporting={importingId === item.id}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-border">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg hover:bg-background-tertiary text-text-muted disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[10px] text-text-secondary">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg hover:bg-background-tertiary text-text-muted disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SignageMediaLibraryTab;
