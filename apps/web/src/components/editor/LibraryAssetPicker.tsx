import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Cloud,
  Search,
  Film,
  Image as ImageIcon,
  Music,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  X,
} from "lucide-react";
import { ScrollArea } from "@openreel/ui";
import {
  useSignageMediaStore,
  resolveSignageAssetUrl,
} from "../../stores/signage-media-store";
import type { SignageMediaItem } from "../../stores/signage-media-store";

export type LibraryFilter = "image" | "video" | "audio" | "pdf" | "all";

interface LibraryAssetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter?: LibraryFilter;
  title?: string;
  onSelect: (item: SignageMediaItem) => void;
}

const FILTER_LABEL: Record<LibraryFilter, string> = {
  image: "Pick an image",
  video: "Pick a video",
  audio: "Pick an audio file",
  pdf: "Pick a PDF",
  all: "Pick a library asset",
};

function matchesFilter(item: SignageMediaItem, filter: LibraryFilter): boolean {
  if (filter === "all") return true;
  const t = (item.type ?? "").toLowerCase();
  if (filter === "pdf") return t === "application/pdf";
  return t.startsWith(`${filter}/`);
}

function iconFor(type: string | null | undefined): React.ReactNode {
  const t = (type ?? "").toLowerCase();
  if (t.startsWith("video/")) return <Film size={28} className="text-sky-400" />;
  if (t.startsWith("audio/")) return <Music size={28} className="text-purple-400" />;
  if (t === "application/pdf") return <FileText size={28} className="text-red-400" />;
  return <ImageIcon size={28} className="text-emerald-400" />;
}

/** Resolve a library item's playback URL. Prefers fileUrl over url. */
export function resolveLibraryAssetUrl(item: SignageMediaItem): string {
  return resolveSignageAssetUrl(item.fileUrl ?? item.url) ?? "";
}

const Thumbnail: React.FC<{
  item: SignageMediaItem;
  onPick: () => void;
}> = ({ item, onPick }) => {
  const thumb = resolveSignageAssetUrl(item.thumbnailUrl);
  const t = (item.type ?? "").toLowerCase();
  const isImage = t.startsWith("image/");
  const previewUrl = isImage ? resolveLibraryAssetUrl(item) : null;

  return (
    <button
      type="button"
      onClick={onPick}
      className="text-left group flex flex-col rounded-lg overflow-hidden border border-zinc-700 hover:border-emerald-500 transition-colors bg-zinc-800"
    >
      <div className="aspect-video bg-zinc-900 relative flex items-center justify-center overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={item.name} className="w-full h-full object-cover" />
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          iconFor(item.type)
        )}
        {item.durationSeconds != null && item.durationSeconds > 0 && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-[9px] text-white font-mono">
            {Math.round(item.durationSeconds)}s
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <div className="text-[11px] font-medium text-zinc-100 truncate" title={item.name}>
          {item.name}
        </div>
        <div className="text-[9px] text-zinc-400 truncate">{item.type}</div>
      </div>
    </button>
  );
};

export const LibraryAssetPicker: React.FC<LibraryAssetPickerProps> = ({
  open,
  onOpenChange,
  filter = "all",
  title,
  onSelect,
}) => {
  const {
    connected,
    items,
    loading,
    error,
    page,
    totalPages,
    search,
    checkConnection,
    fetchItems,
    setSearch,
    setPage,
    refresh,
  } = useSignageMediaStore();

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    if (!open) return;
    checkConnection();
    void fetchItems();
  }, [open, checkConnection, fetchItems]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (searchInput.trim() !== search) setSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, search, setSearch, open]);

  const filteredItems = useMemo(
    () => items.filter((i) => matchesFilter(i, filter)),
    [items, filter],
  );

  const handlePick = useCallback(
    (item: SignageMediaItem) => {
      onSelect(item);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const modal = (
    <div
      className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[90vw] max-w-3xl max-h-[80vh] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-zinc-100"
      >
        <div className="px-5 pt-4 pb-3 border-b border-zinc-800 flex items-start justify-between gap-3">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-zinc-100">
              {title ?? FILTER_LABEL[filter]}
            </h2>
            <div className="flex items-center gap-2 mt-3">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search library…"
                  className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
              <button
                onClick={() => void refresh()}
                disabled={loading}
                title="Refresh"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 -mr-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {!connected ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
            <Cloud size={28} className="text-zinc-500 mb-3" />
            <p className="text-sm text-zinc-300 mb-1 font-medium">
              Not connected to media library
            </p>
            <p className="text-xs text-zinc-500">
              Open this editor from the Digital Signage dashboard to enable
              cloud media.
            </p>
          </div>
        ) : error ? (
          <div className="px-5 pt-3">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-[10px] text-red-400">
              <AlertTriangle size={12} />
              {error}
            </div>
          </div>
        ) : null}

        <ScrollArea className="flex-1 min-h-[260px]">
          <div className="px-5 py-4">
            {loading && filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs text-zinc-400">Loading library…</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-3 shadow-inner">
                  <Cloud size={20} className="text-zinc-500" />
                </div>
                <p className="text-xs text-zinc-300 mb-1 font-medium">
                  No assets to show
                </p>
                <p className="text-[10px] text-zinc-500">
                  Upload an asset to the library to add it here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredItems.map((item) => (
                  <Thumbnail
                    key={item.id}
                    item={item}
                    onPick={() => handlePick(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {totalPages > 1 && connected && (
          <div className="flex items-center justify-center gap-3 px-5 py-2 border-t border-zinc-800">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] text-zinc-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default LibraryAssetPicker;
