import React from "react";
import { Eye, EyeOff, Lock, Sparkles, Trash2, Unlock } from "lucide-react";
import type { SignageWidget } from "../../../types/widgets";
import { useSignageWidgetStore } from "../../../stores/signage-widget-store";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@openreel/ui";

interface WidgetContextMenuProps {
  widget: SignageWidget;
  onClose?: () => void;
}

/**
 * Right-click menu for signage widgets on the timeline. Kept intentionally
 * minimal — Lock/Unlock, Show/Hide, Delete. (Copy / Duplicate / Split were
 * removed at the user's request.) Every action goes through the widget store,
 * which records it in the undo/redo history, so all are undoable.
 */
export const WidgetContextMenu: React.FC<WidgetContextMenuProps> = ({
  widget,
  onClose,
}) => {
  const updateWidget = useSignageWidgetStore((s) => s.updateWidget);
  const removeWidget = useSignageWidgetStore((s) => s.removeWidget);

  const handleToggleLock = () => {
    updateWidget(widget.id, { locked: !widget.locked });
    onClose?.();
  };

  const handleToggleHidden = () => {
    updateWidget(widget.id, { hidden: !widget.hidden });
    onClose?.();
  };

  const handleDelete = () => {
    removeWidget(widget.id);
    onClose?.();
  };

  const typeLabel = `${widget.type.charAt(0).toUpperCase()}${widget.type.slice(
    1,
  )} Widget`;

  return (
    <ContextMenuContent className="min-w-[200px]">
      <ContextMenuLabel className="flex items-center text-[10px] text-text-muted">
        <Sparkles className="mr-2 h-3 w-3 text-primary" />
        {typeLabel}
      </ContextMenuLabel>
      <ContextMenuSeparator />

      <ContextMenuItem onClick={handleToggleLock}>
        {widget.locked ? (
          <Unlock className="mr-2 h-4 w-4" />
        ) : (
          <Lock className="mr-2 h-4 w-4" />
        )}
        {widget.locked ? "Unlock" : "Lock"}
      </ContextMenuItem>
      <ContextMenuItem onClick={handleToggleHidden}>
        {widget.hidden ? (
          <Eye className="mr-2 h-4 w-4" />
        ) : (
          <EyeOff className="mr-2 h-4 w-4" />
        )}
        {widget.hidden ? "Show" : "Hide"}
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
