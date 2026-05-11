import React from "react";
import { v4 as uuidv4 } from "uuid";
import { Plus, Move } from "lucide-react";
import type { SignageWidgetType } from "../../types/widgets";
import {
  cloneDefaultWidgetConfig,
  useSignageWidgetStore,
} from "../../stores/signage-widget-store";

const WIDGETS: {
  type: SignageWidgetType;
  icon: string;
  label: string;
  description: string;
}[] = [
  { type: "calendar", icon: "📅", label: "Calendar", description: "Display event calendars and schedules." },
  { type: "chart", icon: "📊", label: "Chart", description: "Show live or static chart data overlays." },
  { type: "clock", icon: "🕐", label: "Clock", description: "Display real-time timezone-aware clocks." },
  { type: "countdown", icon: "⏱️", label: "Countdown", description: "Run countdowns for launches and events." },
  { type: "iframe", icon: "🪟", label: "IFrame", description: "Embed a website preview with custom sizing and position." },
  { type: "pdf", icon: "📄", label: "PDF", description: "Cycle through PDF pages in timeline." },
  { type: "powerpoint", icon: "📑", label: "PowerPoint", description: "Convert and play PowerPoint slides." },
  { type: "ticker", icon: "📜", label: "Ticker", description: "Scrollable breaking-news style text strips." },
];

export const SignageToolbar: React.FC = () => {
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
    <div className="w-full bg-[#1a1a2e] border-b border-[#2a2a3e] px-4 py-2.5 flex items-center gap-4">
      <div className="text-[#6b7280] font-bold tracking-wide text-xs shrink-0 bg-[#232338] px-2 py-1 rounded border border-[#34344a]">
        SIGNAGE WIDGETS
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        {WIDGETS.map((widget) => (
          <div key={widget.type} className="relative group">
            <button
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/signage-widget", widget.type);
                event.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => handleAddWidget(widget.type)}
              className="bg-[#2a2a3e] hover:bg-[#383850] active:scale-[0.98] text-[#a0a0b0] rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all shadow-sm border border-[#3a3a4e] flex items-center gap-2"
            >
              <span>{widget.icon}</span>
              <span>{widget.label}</span>
              <span className="ml-1 inline-flex items-center gap-1 text-[#a0a0b0]">
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded bg-[#3a3a4e] hover:bg-[#4a4a62]"
                  title="Add widget"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddWidget(widget.type);
                  }}
                >
                  <Plus size={11} />
                </span>
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded bg-[#3a3a4e] hover:bg-[#4a4a62] cursor-grab"
                  title="Grab and drag to timeline"
                >
                  <Move size={11} />
                </span>
              </span>
            </button>

            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
              <div className="bg-black/90 text-white text-[11px] rounded-md px-3 py-2 border border-white/20 shadow-xl">
                <div>{widget.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SignageToolbar;
