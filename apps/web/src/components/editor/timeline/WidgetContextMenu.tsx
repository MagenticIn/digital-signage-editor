import React from "react";
import {
  Eye,
  EyeOff,
  Layers,
  Lock,
  Scissors,
  Sparkles,
  Trash2,
  Unlock,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import type { SignageWidget } from "../../../types/widgets";
import { useSignageWidgetStore } from "../../../stores/signage-widget-store";
import { useTimelineStore } from "../../../stores/timeline-store";
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
 * Right-click menu for signage widgets on the timeline. Uses the same context-menu
 * primitives as ClipContextMenu so widgets feel like clips. Copy/paste and ripple
 * delete are intentionally omitted — there is no per-track widget clipboard yet,
 * and every widget owns its own row so a ripple delete is just a delete.
 *
 * Every action goes through the widget store, which records it in the undo/redo
 * history (Phase 1), so Duplicate/Split/Lock/Hide/Delete are all undoable.
 */
export const WidgetContextMenu: React.FC<WidgetContextMenuProps> = ({
  widget,
  onClose,
}) => {
  const addWidget = useSignageWidgetStore((s) => s.addWidget);
  const updateWidget = useSignageWidgetStore((s) => s.updateWidget);
  const removeWidget = useSignageWidgetStore((s) => s.removeWidget);
  const playheadPosition = useTimelineStore((s) => s.playheadPosition);

  const widgetEnd = widget.startTime + widget.duration;
  const canSplit =
    playheadPosition > widget.startTime + 0.05 &&
    playheadPosition < widgetEnd - 0.05;

  const offsetLayout = (dx: number, dy: number) =>
    widget.layout
      ? { ...widget.layout, x: widget.layout.x + dx, y: widget.layout.y + dy }
      : { x: 64, y: 64, width: 360, height: 220 };

  const handleDuplicate = () => {
    addWidget({
      ...widget,
      id: uuidv4(),
      config: structuredClone(widget.config),
      layout: offsetLayout(24, 24),
    });
    onClose?.();
  };

  const handleSplit = () => {
    if (canSplit) {
      const splitAt = playheadPosition;
      // First segment keeps the original widget id; the second is a new widget.
      // Both are widget/setAll actions in the same tick, so undo treats the
      // split as one step.
      updateWidget(widget.id, { duration: splitAt - widget.startTime });
      addWidget({
        ...widget,
        id: uuidv4(),
        config: structuredClone(widget.config),
        layout: widget.layout ? { ...widget.layout } : undefined,
        startTime: splitAt,
        duration: widgetEnd - splitAt,
      });
    }
    onClose?.();
  };

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
    <ContextMenuContent className="min-w-[220px]">
      <ContextMenuLabel className="flex items-center text-[10px] text-text-muted">
        <Sparkles className="mr-2 h-3 w-3 text-primary" />
        {typeLabel}
      </ContextMenuLabel>
      <ContextMenuSeparator />

      <ContextMenuItem onClick={handleDuplicate}>
        <Layers className="mr-2 h-4 w-4" />
        Duplicate
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem onClick={handleSplit} disabled={!canSplit}>
        <Scissors className="mr-2 h-4 w-4" />
        Split at Playhead
      </ContextMenuItem>

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
