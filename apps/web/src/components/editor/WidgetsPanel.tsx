import React from "react";
import { v4 as uuidv4 } from "uuid";
import { Plus } from "lucide-react";
import type { SignageWidgetType } from "../../types/widgets";
import {
  cloneDefaultWidgetConfig,
  useSignageWidgetStore,
} from "../../stores/signage-widget-store";

const WIDGETS: {
  type: SignageWidgetType;
  icon: string;
  label: string;
}[] = [
  { type: "calendar", icon: "📅", label: "Calendar" },
  { type: "chart", icon: "📊", label: "Chart" },
  { type: "clock", icon: "🕐", label: "Clock" },
  { type: "countdown", icon: "⏱️", label: "Countdown" },
  { type: "iframe", icon: "🪟", label: "IFrame" },
  { type: "pdf", icon: "📄", label: "PDF" },
  { type: "powerpoint", icon: "📑", label: "PowerPoint" },
  { type: "ticker", icon: "📜", label: "Ticker" },
];

export const WidgetsPanel: React.FC = () => {
  const addWidget = useSignageWidgetStore((state) => state.addWidget);

  const handleAddWidget = (type: SignageWidgetType) => {
    let layout = { x: 40, y: 40, width: 360, height: 220 };
    if (type === "ticker") {
      layout = { x: 40, y: 440, width: 800, height: 60 };
    }

    addWidget({
      id: uuidv4(),
      type,
      startTime: 0,
      duration: 10,
      config: cloneDefaultWidgetConfig(type),
      locked: false,
      hidden: false,
      layout,
    });
  };

  return (
    <div className="w-56 shrink-0 bg-background-secondary border-r border-border flex flex-col h-full">
      <div className="px-4 py-4 border-b border-border">
        <span className="font-bold text-base text-text-primary tracking-tight">
          Widgets
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2 overflow-y-auto">
        {WIDGETS.map((widget) => (
          <button
            key={widget.type}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("application/signage-widget", widget.type);
              event.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => handleAddWidget(widget.type)}
            className="w-full bg-background-tertiary hover:bg-background-elevated text-text-secondary rounded-md px-3 py-2 text-xs font-semibold transition-all border border-border flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span>{widget.icon}</span>
              <span>{widget.label}</span>
            </span>
            <Plus size={12} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default WidgetsPanel;
