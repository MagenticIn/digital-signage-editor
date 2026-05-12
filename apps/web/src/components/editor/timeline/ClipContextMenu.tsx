import React from "react";
import { Eye, EyeOff, Film, Image, Lock, Trash2, Unlock, Volume2 } from "lucide-react";
import type { Clip, Track } from "@openreel/core";
import { useProjectStore } from "../../../stores/project-store";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@openreel/ui";

interface ClipContextMenuProps {
  clip: Clip;
  track: Track;
  onClose?: () => void;
}

/**
 * Right-click menu for media-tab clips on the timeline. Kept intentionally
 * minimal — Lock/Unlock, Show/Hide, Delete — to mirror the signage widget menu.
 * Lock / Hide act on the clip's track (clips inherit their track's lock/hide
 * state); Delete removes just the clip. Every action goes through the project
 * store, so all are undoable. (Copy / Duplicate / Split / Effects / Separate
 * Audio / Ripple Delete were removed at the user's request.)
 */
export const ClipContextMenu: React.FC<ClipContextMenuProps> = ({
  clip,
  track,
  onClose,
}) => {
  const { lockTrack, hideTrack, removeClip } = useProjectStore();

  const isVideo = track.type === "video";
  const isAudio = track.type === "audio";
  const isImage = track.type === "image";

  const typeLabel = isVideo
    ? "Video Clip"
    : isAudio
      ? "Audio Clip"
      : isImage
        ? "Image Clip"
        : "Clip";
  const typeIcon = isVideo ? (
    <Film className="mr-2 h-3 w-3 text-primary" />
  ) : isAudio ? (
    <Volume2 className="mr-2 h-3 w-3 text-blue-400" />
  ) : isImage ? (
    <Image className="mr-2 h-3 w-3 text-purple-400" />
  ) : null;

  const handleToggleLock = () => {
    void lockTrack(track.id, !track.locked);
    onClose?.();
  };

  const handleToggleHidden = () => {
    void hideTrack(track.id, !track.hidden);
    onClose?.();
  };

  const handleDelete = () => {
    void removeClip(clip.id);
    onClose?.();
  };

  return (
    <ContextMenuContent className="min-w-[200px]">
      <ContextMenuLabel className="flex items-center text-[10px] text-text-muted">
        {typeIcon}
        {typeLabel}
      </ContextMenuLabel>
      <ContextMenuSeparator />

      <ContextMenuItem onClick={handleToggleLock}>
        {track.locked ? (
          <Unlock className="mr-2 h-4 w-4" />
        ) : (
          <Lock className="mr-2 h-4 w-4" />
        )}
        {track.locked ? "Unlock" : "Lock"}
      </ContextMenuItem>
      <ContextMenuItem onClick={handleToggleHidden}>
        {track.hidden ? (
          <Eye className="mr-2 h-4 w-4" />
        ) : (
          <EyeOff className="mr-2 h-4 w-4" />
        )}
        {track.hidden ? "Show" : "Hide"}
      </ContextMenuItem>

      <ContextMenuSeparator />
      <ContextMenuItem onClick={handleDelete} className="text-red-400">
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
        <ContextMenuShortcut>⌫</ContextMenuShortcut>
      </ContextMenuItem>
    </ContextMenuContent>
  );
};
