import React from "react";
import {
  Bold,
  Italic,
  Underline,
  Square,
  Circle as CircleIcon,
  Triangle,
  Star,
  ArrowRight,
  Hexagon,
  Library as LibraryIcon,
} from "lucide-react";
import { useSignageWidgetStore } from "../../../stores/signage-widget-store";
import * as pdfjs from "pdfjs-dist";
import {
  LibraryAssetPicker,
  resolveLibraryAssetUrl,
  toLibraryMediaRef,
  type LibraryFilter,
} from "../LibraryAssetPicker";
import type { SignageMediaItem } from "../../../stores/signage-media-store";
import type {
  AudioWidgetConfig,
  CalendarConfig,
  ChartConfig,
  ClockConfig,
  CountdownConfig,
  DatasetViewConfig,
  GraphicsShapeType,
  GraphicsWidgetConfig,
  HLSConfig,
  HtmlPackageConfig,
  ImageWidgetConfig,
  IframeConfig,
  NotificationConfig,
  PDFConfig,
  PowerPointConfig,
  ShellCommandConfig,
  SignageWidget,
  SpacerConfig,
  TextWidgetConfig,
  TickerConfig,
  VideoInConfig,
  VideoWidgetConfig,
} from "../../../types/widgets";
import { ColorOpacityInput } from "./ColorOpacityInput";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const inputClass = "w-full bg-background border border-border rounded px-2 py-1 text-xs";
const sectionClass = "space-y-2 rounded-lg border border-border p-3 bg-background-tertiary";
const labelClass = "text-[10px] text-text-secondary block mb-1";
const smallBtnClass =
  "text-[10px] px-2 py-1 rounded border border-border text-text-secondary bg-background hover:bg-background-elevated";

// Inline "Pick from Library" trigger used by Image/Video/Audio/PDF widgets to
// replace local file uploads. Selecting an item fires onPick with the library
// asset; the caller writes the URL into the widget config.
const LibraryAssetField: React.FC<{
  filter: LibraryFilter;
  label?: string;
  currentUrl?: string;
  onPick: (item: SignageMediaItem) => void;
}> = ({ filter, label = "Library asset", currentUrl, onPick }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] rounded border border-border bg-background text-text-primary hover:border-primary/50 transition-colors"
      >
        <LibraryIcon size={12} className="text-text-muted" />
        <span className="truncate">
          {currentUrl ? "Change library asset" : "Pick from Library"}
        </span>
      </button>
      <LibraryAssetPicker
        open={open}
        onOpenChange={setOpen}
        filter={filter}
        onSelect={onPick}
      />
    </div>
  );
};

interface WidgetInspectorProps {
  widget: SignageWidget;
}

export const WidgetInspector: React.FC<WidgetInspectorProps> = ({ widget }) => {
  const updateWidget = useSignageWidgetStore((state) => state.updateWidget);
  const updateWidgetConfig = useSignageWidgetStore((state) => state.updateWidgetConfig);

  const updateConfig = (config: SignageWidget["config"]) => {
    updateWidgetConfig(widget.id, config);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border p-3 bg-background-tertiary">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase bg-[#1e1e2e] text-[#8888aa] px-2 py-1 rounded border border-[#2e2e42]">
            {widget.type} widget
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateWidget(widget.id, { locked: !widget.locked })}
              className={smallBtnClass}
            >
              {widget.locked ? "Unlock" : "Lock"}
            </button>
            <button
              onClick={() => updateWidget(widget.id, { hidden: !widget.hidden })}
              className={smallBtnClass}
            >
              {widget.hidden ? "Show" : "Hide"}
            </button>
            <button
              onClick={() => {
                useSignageWidgetStore.getState().removeWidget(widget.id);
              }}
              className="text-[10px] px-2 py-1 rounded border border-red-500/40 text-red-300 bg-red-500/10 hover:bg-red-500/20"
            >
              Delete
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <label className="text-[10px] text-text-secondary">Start</label>
          <input
            type="number"
            className={inputClass}
            value={widget.startTime}
            onChange={(e) => updateWidget(widget.id, { startTime: Number(e.target.value) || 0 })}
          />
          <label className="text-[10px] text-text-secondary">Duration</label>
          <input
            type="number"
            className={inputClass}
            value={widget.duration}
            onChange={(e) => updateWidget(widget.id, { duration: Number(e.target.value) || 1 })}
          />
          <label className="text-[10px] text-text-secondary">X</label>
          <input
            type="number"
            className={inputClass}
            value={widget.layout?.x ?? 40}
            onChange={(e) =>
              updateWidget(widget.id, {
                layout: {
                  x: Number(e.target.value) || 0,
                  y: widget.layout?.y ?? 40,
                  width: widget.layout?.width ?? 360,
                  height: widget.layout?.height ?? 220,
                },
              })
            }
          />
          <label className="text-[10px] text-text-secondary">Y</label>
          <input
            type="number"
            className={inputClass}
            value={widget.layout?.y ?? 40}
            onChange={(e) =>
              updateWidget(widget.id, {
                layout: {
                  x: widget.layout?.x ?? 40,
                  y: Number(e.target.value) || 0,
                  width: widget.layout?.width ?? 360,
                  height: widget.layout?.height ?? 220,
                },
              })
            }
          />
          <label className="text-[10px] text-text-secondary">Width</label>
          <input
            type="number"
            className={inputClass}
            value={widget.layout?.width ?? 360}
            onChange={(e) =>
              updateWidget(widget.id, {
                layout: {
                  x: widget.layout?.x ?? 40,
                  y: widget.layout?.y ?? 40,
                  width: Number(e.target.value) || 120,
                  height: widget.layout?.height ?? 220,
                },
              })
            }
          />
          <label className="text-[10px] text-text-secondary">Height</label>
          <input
            type="number"
            className={inputClass}
            value={widget.layout?.height ?? 220}
            onChange={(e) =>
              updateWidget(widget.id, {
                layout: {
                  x: widget.layout?.x ?? 40,
                  y: widget.layout?.y ?? 40,
                  width: widget.layout?.width ?? 360,
                  height: Number(e.target.value) || 80,
                },
              })
            }
          />
        </div>
      </div>

      {widget.type === "clock" && (
        <ClockFields config={widget.config as ClockConfig} onChange={updateConfig} />
      )}
      {widget.type === "countdown" && (
        <CountdownFields config={widget.config as CountdownConfig} onChange={updateConfig} />
      )}
      {widget.type === "ticker" && (
        <TickerFields
          config={widget.config as TickerConfig}
          onChange={updateConfig}
          layout={widget.layout}
          onLayoutChange={(w, h) =>
            updateWidget(widget.id, {
              layout: { ...(widget.layout || { x: 0, y: 0 }), width: w, height: h },
            })
          }
        />
      )}
      {widget.type === "iframe" && (
        <IframeFields config={widget.config as IframeConfig} onChange={updateConfig} />
      )}
      {widget.type === "pdf" && (
        <PDFFields
          config={widget.config as PDFConfig}
          onChange={updateConfig}
          onDurationChange={(duration) => updateWidget(widget.id, { duration })}
        />
      )}
      {widget.type === "powerpoint" && (
        <PowerPointFields config={widget.config as PowerPointConfig} onChange={updateConfig} />
      )}
      {widget.type === "chart" && (
        <ChartFields config={widget.config as ChartConfig} onChange={updateConfig} />
      )}
      {widget.type === "calendar" && (
        <CalendarFields config={widget.config as CalendarConfig} onChange={updateConfig} />
      )}
      {widget.type === "text" && (
        <TextFields config={widget.config as TextWidgetConfig} onChange={updateConfig} />
      )}
      {widget.type === "notification" && (
        <NotificationFields config={widget.config as NotificationConfig} onChange={updateConfig} />
      )}
      {widget.type === "datasetView" && (
        <DatasetViewFields config={widget.config as DatasetViewConfig} onChange={updateConfig} />
      )}
      {widget.type === "shellCommand" && (
        <ShellCommandFields config={widget.config as ShellCommandConfig} onChange={updateConfig} />
      )}
      {widget.type === "spacer" && (
        <SpacerFields config={widget.config as SpacerConfig} onChange={updateConfig} />
      )}
      {widget.type === "graphics" && (
        <GraphicsFields config={widget.config as GraphicsWidgetConfig} onChange={updateConfig} />
      )}
      {widget.type === "videoIn" && (
        <VideoInFields config={widget.config as VideoInConfig} onChange={updateConfig} />
      )}
      {widget.type === "hls" && (
        <HLSFields config={widget.config as HLSConfig} onChange={updateConfig} />
      )}
      {widget.type === "htmlPackage" && (
        <HtmlPackageFields config={widget.config as HtmlPackageConfig} onChange={updateConfig} />
      )}
      {widget.type === "image" && (
        <ImageFields config={widget.config as ImageWidgetConfig} onChange={updateConfig} />
      )}
      {widget.type === "video" && (
        <VideoFields config={widget.config as VideoWidgetConfig} onChange={updateConfig} />
      )}
      {widget.type === "audio" && (
        <AudioFields config={widget.config as AudioWidgetConfig} onChange={updateConfig} />
      )}
    </div>
  );
};

const ClockFields = ({ config, onChange }: { config: ClockConfig; onChange: (v: ClockConfig) => void }) => (
  <div className={sectionClass}>
    <div className="grid grid-cols-2 gap-2">
      <select className={inputClass} value={config.clockType || "digital"} onChange={(e) => onChange({ ...config, clockType: e.target.value as ClockConfig["clockType"] })}>
        <option value="digital">Digital Clock</option>
        <option value="analog">Analog Clock</option>
      </select>
      <select className={inputClass} value={config.format} onChange={(e) => onChange({ ...config, format: e.target.value as ClockConfig["format"] })}>
        <option value="12h">12h</option>
        <option value="24h">24h</option>
      </select>
    </div>
    <select className={inputClass} value={config.timezone} onChange={(e) => onChange({ ...config, timezone: e.target.value })}>
      <option value="Asia/Kolkata">IST (Asia/Kolkata)</option>
      <option value="UTC">UTC</option>
      <option value="America/New_York">EST (New York)</option>
      <option value="America/Chicago">CST (Chicago)</option>
      <option value="America/Denver">MST (Denver)</option>
      <option value="America/Los_Angeles">PST (Los Angeles)</option>
      <option value="Europe/London">GMT (London)</option>
      <option value="Europe/Paris">CET (Paris)</option>
      <option value="Asia/Tokyo">JST (Tokyo)</option>
      <option value="Australia/Sydney">AEDT (Sydney)</option>
    </select>
    <label className="text-xs flex items-center gap-2">
      <input type="checkbox" checked={config.showSeconds} onChange={(e) => onChange({ ...config, showSeconds: e.target.checked })} />Show seconds
    </label>
    <div>
      <label className={labelClass}>Color</label>
      <input type="color" className="w-full h-8" value={config.color} onChange={(e) => onChange({ ...config, color: e.target.value })} />
    </div>
    <div>
      <label className={labelClass}>Font size (px)</label>
      <input type="number" className={inputClass} value={config.fontSize} onChange={(e) => onChange({ ...config, fontSize: Number(e.target.value) || 12 })} />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className={labelClass}>X</label>
        <input type="number" className={inputClass} value={config.position.x} onChange={(e) => onChange({ ...config, position: { ...config.position, x: Number(e.target.value) || 0 } })} />
      </div>
      <div>
        <label className={labelClass}>Y</label>
        <input type="number" className={inputClass} value={config.position.y} onChange={(e) => onChange({ ...config, position: { ...config.position, y: Number(e.target.value) || 0 } })} />
      </div>
    </div>
  </div>
);

const CountdownFields = ({ config, onChange }: { config: CountdownConfig; onChange: (v: CountdownConfig) => void }) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>Target date / time</label>
      <input
        type="datetime-local"
        className={inputClass}
        value={config.targetDateTime.slice(0, 16)}
        onChange={(e) => onChange({ ...config, targetDateTime: new Date(e.target.value).toISOString() })}
      />
    </div>
    <div>
      <label className={labelClass}>Format</label>
      <select className={inputClass} value={config.format} onChange={(e) => onChange({ ...config, format: e.target.value as CountdownConfig["format"] })}>
        <option value="DD:HH:MM:SS">DD:HH:MM:SS</option>
        <option value="HH:MM:SS">HH:MM:SS</option>
        <option value="MM:SS">MM:SS</option>
      </select>
    </div>
    <div>
      <label className={labelClass}>Completed message</label>
      <input className={inputClass} value={config.completedMessage} onChange={(e) => onChange({ ...config, completedMessage: e.target.value })} />
    </div>
    <div>
      <label className={labelClass}>Color</label>
      <input type="color" className="w-full h-8" value={config.color} onChange={(e) => onChange({ ...config, color: e.target.value })} />
    </div>
    <div>
      <label className={labelClass}>Font size (px)</label>
      <input type="number" className={inputClass} value={config.fontSize} onChange={(e) => onChange({ ...config, fontSize: Number(e.target.value) || 12 })} />
    </div>
  </div>
);

const TickerFields = ({
  config,
  onChange,
  layout,
  onLayoutChange,
}: {
  config: TickerConfig;
  onChange: (v: TickerConfig) => void;
  layout?: { x: number; y: number; width: number; height: number };
  onLayoutChange?: (width: number, height: number) => void;
}) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>Content mode</label>
      <div className="flex gap-3 text-xs">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={config.mode === "text"}
            onChange={() => onChange({ ...config, mode: "text" })}
          />
          Single message
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={config.mode === "list"}
            onChange={() =>
              onChange({
                ...config,
                mode: "list",
                entries: config.entries.length > 0 ? config.entries : [config.text || ""],
              })
            }
          />
          List of entries
        </label>
      </div>
    </div>

    {config.mode === "text" ? (
      <div>
        <label className={labelClass}>Message</label>
        <textarea
          className="w-full h-20 bg-background border border-border rounded px-2 py-1 text-xs"
          value={config.text}
          onChange={(e) => onChange({ ...config, text: e.target.value })}
          placeholder="Ticker text..."
        />
      </div>
    ) : (
      <>
        <div>
          <label className={labelClass}>Title (optional)</label>
          <input
            className={inputClass}
            value={config.title ?? ""}
            onChange={(e) => onChange({ ...config, title: e.target.value })}
            placeholder="Heading..."
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Entries</label>
          {config.entries.map((entry, i) => (
            <div key={i} className="flex gap-1">
              <input
                className={`${inputClass} flex-1`}
                value={entry}
                onChange={(e) => {
                  const next = [...config.entries];
                  next[i] = e.target.value;
                  onChange({ ...config, entries: next });
                }}
                placeholder={`Entry ${i + 1}`}
              />
              <button
                type="button"
                className={smallBtnClass}
                onClick={() => {
                  const next = config.entries.filter((_, idx) => idx !== i);
                  onChange({ ...config, entries: next });
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className={smallBtnClass}
            onClick={() => onChange({ ...config, entries: [...config.entries, ""] })}
          >
            + Add entry
          </button>
        </div>
      </>
    )}

    <div>
      <label className="text-[10px] text-text-secondary flex justify-between">
        <span>Scroll speed</span>
        <span>{config.speed}</span>
      </label>
      <input
        type="range"
        min={10}
        max={300}
        value={config.speed}
        onChange={(e) => onChange({ ...config, speed: Number(e.target.value) })}
        className="w-full"
      />
    </div>

    <ColorOpacityInput
      label="Background color"
      value={config.backgroundColor}
      onChange={(rgba) => onChange({ ...config, backgroundColor: rgba })}
    />
    <ColorOpacityInput
      label="Text color"
      value={config.textColor}
      onChange={(rgba) => onChange({ ...config, textColor: rgba })}
    />

    <div className="grid grid-cols-2 gap-2 mt-2">
      <div>
        <label className={labelClass}>Font family</label>
        <select
          className={inputClass}
          value={config.fontFamily || "Inter"}
          onChange={(e) => onChange({ ...config, fontFamily: e.target.value })}
        >
          <option value="Inter">Inter (Default)</option>
          <option value="Roboto">Roboto</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Arial">Arial</option>
          <option value="Open Sans">Open Sans</option>
          <option value="Montserrat">Montserrat</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Font size (px)</label>
        <input
          type="number"
          className={inputClass}
          value={config.fontSize}
          onChange={(e) => onChange({ ...config, fontSize: Number(e.target.value) || 12 })}
        />
      </div>
    </div>

    {layout && onLayoutChange && (
      <div className="pt-2 border-t border-border mt-2">
        <label className="text-[10px] text-text-secondary flex justify-between">
          <span>Strip thickness (height)</span>
          <span>{layout.height}px</span>
        </label>
        <input
          type="range"
          min={30}
          max={400}
          value={layout.height}
          onChange={(e) => onLayoutChange(layout.width, Number(e.target.value))}
          className="w-full"
        />
      </div>
    )}
  </div>
);

const IframeFields = ({
  config,
  onChange,
}: {
  config: IframeConfig;
  onChange: (v: IframeConfig) => void;
}) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>URL</label>
      <input
        className={inputClass}
        value={config.src}
        onChange={(e) => onChange({ ...config, src: e.target.value })}
        placeholder="https://example.com"
      />
    </div>
    <div className="flex gap-2">
      <button
        className={smallBtnClass}
        onClick={() => {
          const raw = (config.src || "").trim();
          if (!raw) return;
          const withProtocol =
            raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
          window.open(withProtocol, "_blank", "noopener,noreferrer");
        }}
      >
        Open URL in new tab
      </button>
      <button
        className={smallBtnClass}
        onClick={() => {
          const raw = (config.src || "").trim();
          if (!raw) return;
          const withProtocol =
            raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
          try {
            const url = new URL(withProtocol);
            const host = url.hostname.toLowerCase();
            const path = url.pathname;
            if (host.includes("docs.google.com")) {
              if (path.includes("/document/") || path.includes("/presentation/")) {
                url.pathname = path.replace(/\/edit.*$/, "/preview");
                url.search = "";
                onChange({ ...config, src: url.toString() });
                return;
              }
              if (path.includes("/spreadsheets/")) {
                url.pathname = path.replace(/\/edit.*$/, "/preview");
                onChange({ ...config, src: url.toString() });
                return;
              }
            }
          } catch {
            // ignore
          }
        }}
      >
        Convert to embeddable URL
      </button>
    </div>
    <p className="text-[10px] text-text-muted">
      Some sites block iframe embedding via security headers (X-Frame-Options / CSP).
    </p>
    <div>
      <label className={labelClass}>Frame title</label>
      <input
        className={inputClass}
        value={config.title}
        onChange={(e) => onChange({ ...config, title: e.target.value })}
      />
    </div>
    <label className="text-xs flex items-center gap-2">
      <input
        type="checkbox"
        checked={config.allowFullscreen}
        onChange={(e) => onChange({ ...config, allowFullscreen: e.target.checked })}
      />
      Allow fullscreen
    </label>
    <div>
      <label className={labelClass}>Render mode</label>
      <select
        className={inputClass}
        value={config.renderMode}
        onChange={(e) => onChange({ ...config, renderMode: e.target.value as IframeConfig["renderMode"] })}
      >
        <option value="auto">Auto (iframe then snapshot fallback)</option>
        <option value="iframe">Direct iframe</option>
        <option value="snapshot">Snapshot proxy</option>
      </select>
    </div>
    <div>
      <label className={labelClass}>Snapshot refresh (seconds)</label>
      <input
        type="number"
        className={inputClass}
        value={config.snapshotRefreshInterval}
        onChange={(e) =>
          onChange({ ...config, snapshotRefreshInterval: Number(e.target.value) || 30 })
        }
      />
    </div>
    <div>
      <label className={labelClass}>Sandbox</label>
      <select
        className={inputClass}
        value={config.sandbox}
        onChange={(e) => onChange({ ...config, sandbox: e.target.value as IframeConfig["sandbox"] })}
      >
        <option value="">No sandbox</option>
        <option value="allow-scripts">allow-scripts</option>
        <option value="allow-same-origin">allow-same-origin</option>
        <option value="allow-scripts allow-same-origin">allow-scripts allow-same-origin</option>
      </select>
    </div>
    <div>
      <label className={labelClass}>Zoom</label>
      <input
        type="number"
        step="0.1"
        min="0.1"
        max="5.0"
        className={inputClass}
        value={config.zoom || 1}
        onChange={(e) => onChange({ ...config, zoom: Number(e.target.value) || 1 })}
      />
    </div>
    <label className="text-xs flex items-center gap-2">
      <input
        type="checkbox"
        checked={config.transparentBackground || false}
        onChange={(e) => onChange({ ...config, transparentBackground: e.target.checked })}
      />
      Transparent background
    </label>
    <div>
      <label className={labelClass}>Border radius</label>
      <input
        type="number"
        className={inputClass}
        value={config.borderRadius}
        onChange={(e) => onChange({ ...config, borderRadius: Number(e.target.value) || 0 })}
      />
    </div>
  </div>
);

const PDFFields = ({
  config,
  onChange,
  onDurationChange,
}: {
  config: PDFConfig;
  onChange: (v: PDFConfig) => void;
  onDurationChange: (duration: number) => void;
}) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>File URL</label>
      <input
        className={inputClass}
        value={config.fileUrl ?? ""}
        onChange={(e) => onChange({ ...config, fileUrl: e.target.value || undefined })}
        placeholder="https://your-backend/file.pdf"
      />
    </div>
    <LibraryAssetField
      filter="pdf"
      label="or pick from library"
      currentUrl={config.fileUrl}
      onPick={async (item) => {
        const url = resolveLibraryAssetUrl(item);
        if (!url) return;
        // Parse the PDF from URL to count pages so duration stays in sync.
        let totalPages = config.totalPages || 0;
        try {
          const doc = await pdfjs.getDocument({ url }).promise;
          totalPages = doc.numPages;
        } catch (err) {
          console.warn("[PDFFields] Failed to count pages for library PDF:", err);
        }
        onChange({
          ...config,
          file: null,
          fileUrl: url,
          totalPages,
          libraryMedia: toLibraryMediaRef(item, url),
        });
        if (totalPages > 0) {
          onDurationChange(totalPages * Math.max(1, config.secondsPerPage));
        }
      }}
    />
    <div>
      <label className={labelClass}>Seconds per page</label>
      <input
        type="number"
        className={inputClass}
        value={config.secondsPerPage}
        onChange={(e) => {
          const secondsPerPage = Number(e.target.value) || 1;
          onChange({ ...config, secondsPerPage });
          onDurationChange((config.totalPages || 0) * secondsPerPage);
        }}
      />
    </div>
    <div>
      <label className={labelClass}>Fit</label>
      <select className={inputClass} value={config.fit} onChange={(e) => onChange({ ...config, fit: e.target.value as PDFConfig["fit"] })}>
        <option value="fill">Fill (cover the widget)</option>
        <option value="contain">Contain (letterbox)</option>
        <option value="actual">Actual size</option>
      </select>
    </div>
    <div>
      <label className={labelClass}>Transition</label>
      <select className={inputClass} value={config.transition} onChange={(e) => onChange({ ...config, transition: e.target.value as PDFConfig["transition"] })}>
        <option value="none">None</option>
        <option value="fade">Fade</option>
        <option value="slide">Slide</option>
      </select>
    </div>
    <label className="text-xs flex items-center gap-2">
      <input type="checkbox" checked={config.showPageIndicator} onChange={(e) => onChange({ ...config, showPageIndicator: e.target.checked })} />Show page indicator
    </label>
    <label className="text-xs flex items-center gap-2">
      <input type="checkbox" checked={config.loop} onChange={(e) => onChange({ ...config, loop: e.target.checked })} />Loop
    </label>
  </div>
);

const PowerPointFields = ({ config, onChange }: { config: PowerPointConfig; onChange: (v: PowerPointConfig) => void }) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>PDF URL</label>
      <input
        className={inputClass}
        value={config.fileUrl ?? ""}
        onChange={(e) => onChange({ ...config, fileUrl: e.target.value || undefined })}
        placeholder="https://your-backend/slides.pdf"
      />
      <p className="text-[10px] text-text-muted mt-1">
        Paste the URL of a PDF rendition of your slideshow. The backend PPTX
        converter isn't wired into the editor, so library/local PPTX picks
        aren't supported here yet.
      </p>
    </div>
    <div>
      <label className={labelClass}>Seconds per slide</label>
      <input type="number" className={inputClass} value={config.secondsPerSlide} onChange={(e) => onChange({ ...config, secondsPerSlide: Number(e.target.value) || 1 })} />
    </div>
    <div>
      <label className={labelClass}>Fit</label>
      <select className={inputClass} value={config.fit} onChange={(e) => onChange({ ...config, fit: e.target.value as PowerPointConfig["fit"] })}>
        <option value="fill">Fill (cover the widget)</option>
        <option value="contain">Contain (letterbox)</option>
        <option value="actual">Actual size</option>
      </select>
    </div>
    <div>
      <label className={labelClass}>Transition</label>
      <select className={inputClass} value={config.transition} onChange={(e) => onChange({ ...config, transition: e.target.value as PowerPointConfig["transition"] })}>
        <option value="none">None</option>
        <option value="fade">Fade</option>
        <option value="slide">Slide</option>
      </select>
    </div>
    <label className="text-xs flex items-center gap-2">
      <input type="checkbox" checked={config.showPageIndicator} onChange={(e) => onChange({ ...config, showPageIndicator: e.target.checked })} />Show slide indicator
    </label>
    <label className="text-xs flex items-center gap-2">
      <input type="checkbox" checked={config.loop} onChange={(e) => onChange({ ...config, loop: e.target.checked })} />Loop
    </label>
  </div>
);

const ChartFields = ({ config, onChange }: { config: ChartConfig; onChange: (v: ChartConfig) => void }) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>Title (optional)</label>
      <input
        className={inputClass}
        value={config.title ?? ""}
        onChange={(e) => onChange({ ...config, title: e.target.value || undefined })}
        placeholder="Leave blank to hide"
      />
    </div>
    <div>
      <label className={labelClass}>Chart type</label>
      <select className={inputClass} value={config.chartType} onChange={(e) => onChange({ ...config, chartType: e.target.value as ChartConfig["chartType"] })}>
        <option value="bar">Bar</option>
        <option value="line">Line</option>
        <option value="pie">Pie</option>
        <option value="donut">Donut</option>
      </select>
    </div>
    <div>
      <label className={labelClass}>Data source</label>
      <div className="flex gap-3 text-xs">
        <label><input type="radio" checked={config.dataSource === "manual"} onChange={() => onChange({ ...config, dataSource: "manual" })} /> Manual</label>
        <label><input type="radio" checked={config.dataSource === "api"} onChange={() => onChange({ ...config, dataSource: "api" })} /> API</label>
      </div>
    </div>
    {config.dataSource === "api" ? (
      <>
        <div>
          <label className={labelClass}>API URL</label>
          <input className={inputClass} value={config.apiUrl ?? ""} onChange={(e) => onChange({ ...config, apiUrl: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Refresh interval (s)</label>
          <input type="number" className={inputClass} value={config.refreshInterval ?? 30} onChange={(e) => onChange({ ...config, refreshInterval: Number(e.target.value) || 30 })} />
        </div>
      </>
    ) : (
      <div>
        <label className={labelClass}>Data rows</label>
        <div className="grid grid-cols-[minmax(0,1fr)_72px_24px] gap-1 text-[10px] text-text-muted px-1">
          <span>Label</span>
          <span>Value</span>
          <span />
        </div>
        <div className="space-y-1 mt-1">
          {config.data.map((row, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_72px_24px] gap-1 items-center">
              <input
                className={`${inputClass} min-w-0`}
                value={row.label}
                onChange={(e) => {
                  const next = [...config.data];
                  next[i] = { ...row, label: e.target.value };
                  onChange({ ...config, data: next });
                }}
                placeholder="Label"
              />
              <input
                type="number"
                className={`${inputClass} min-w-0`}
                value={row.value}
                onChange={(e) => {
                  const next = [...config.data];
                  next[i] = { ...row, value: Number(e.target.value) || 0 };
                  onChange({ ...config, data: next });
                }}
                placeholder="Value"
              />
              <button
                type="button"
                className={`${smallBtnClass} px-1`}
                onClick={() => onChange({ ...config, data: config.data.filter((_, idx) => idx !== i) })}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className={smallBtnClass}
            onClick={() => onChange({ ...config, data: [...config.data, { label: "", value: 0 }] })}
          >
            + Add row
          </button>
        </div>
      </div>
    )}
    <div>
      <label className={labelClass}>Colors (comma-separated)</label>
      <input className={inputClass} value={config.colors.join(",")} onChange={(e) => onChange({ ...config, colors: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
    </div>
  </div>
);

const CalendarFields = ({ config, onChange }: { config: CalendarConfig; onChange: (v: CalendarConfig) => void }) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>Calendar iCal URL</label>
      <input className={inputClass} value={config.calendarUrl} onChange={(e) => onChange({ ...config, calendarUrl: e.target.value })} placeholder="https://..." />
    </div>
    <div>
      <label className={labelClass}>Refresh interval (seconds)</label>
      <input type="number" className={inputClass} value={config.refreshInterval} onChange={(e) => onChange({ ...config, refreshInterval: Number(e.target.value) || 60 })} />
    </div>
    <div>
      <label className={labelClass}>First day of week</label>
      <select className={inputClass} value={config.firstDayOfWeek} onChange={(e) => onChange({ ...config, firstDayOfWeek: Number(e.target.value) as 0 | 1 })}>
        <option value={0}>Sunday</option>
        <option value={1}>Monday</option>
      </select>
    </div>
    <label className="text-xs flex items-center gap-2">
      <input type="checkbox" checked={config.showHeader} onChange={(e) => onChange({ ...config, showHeader: e.target.checked })} />Show month header
    </label>
    <label className="text-xs flex items-center gap-2">
      <input type="checkbox" checked={config.showNavigation} onChange={(e) => onChange({ ...config, showNavigation: e.target.checked })} />Show navigation buttons
    </label>
    <label className="text-xs flex items-center gap-2">
      <input type="checkbox" checked={config.showWeekdayLabels} onChange={(e) => onChange({ ...config, showWeekdayLabels: e.target.checked })} />Show weekday labels
    </label>
    <ColorOpacityInput label="Background" value={config.backgroundColor} onChange={(rgba) => onChange({ ...config, backgroundColor: rgba })} />
    <ColorOpacityInput label="Text color" value={config.textColor} onChange={(rgba) => onChange({ ...config, textColor: rgba })} />
    <ColorOpacityInput label="Muted text" value={config.mutedTextColor} onChange={(rgba) => onChange({ ...config, mutedTextColor: rgba })} />
    <ColorOpacityInput label="Today highlight" value={config.todayColor} onChange={(rgba) => onChange({ ...config, todayColor: rgba })} />
    <ColorOpacityInput label="Accent (events & nav)" value={config.accentColor} onChange={(rgba) => onChange({ ...config, accentColor: rgba })} />
    <ColorOpacityInput label="Gridlines" value={config.borderColor} onChange={(rgba) => onChange({ ...config, borderColor: rgba })} />
  </div>
);

const TextFields = ({ config, onChange }: { config: TextWidgetConfig; onChange: (v: TextWidgetConfig) => void }) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>Text</label>
      <textarea
        className="w-full h-20 bg-background border border-border rounded px-2 py-1 text-xs"
        value={config.text}
        onChange={(e) => onChange({ ...config, text: e.target.value })}
      />
    </div>
    <div>
      <label className={labelClass}>Font size (px)</label>
      <input type="number" className={inputClass} value={config.fontSize} onChange={(e) => onChange({ ...config, fontSize: Number(e.target.value) || 12 })} />
    </div>
    <ColorOpacityInput label="Text color" value={config.color} onChange={(rgba) => onChange({ ...config, color: rgba })} />
    <ColorOpacityInput label="Background color" value={config.backgroundColor} onChange={(rgba) => onChange({ ...config, backgroundColor: rgba })} />
    <div>
      <label className={labelClass}>Text align</label>
      <select className={inputClass} value={config.textAlign} onChange={(e) => onChange({ ...config, textAlign: e.target.value as TextWidgetConfig["textAlign"] })}>
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
    </div>
    <div>
      <label className={labelClass}>Style</label>
      <div className="flex gap-1">
        {([
          { key: "bold" as const, icon: Bold, title: "Bold" },
          { key: "italic" as const, icon: Italic, title: "Italic" },
          { key: "underline" as const, icon: Underline, title: "Underline" },
        ]).map(({ key, icon: Icon, title }) => (
          <button
            key={key}
            type="button"
            title={title}
            onClick={() => onChange({ ...config, [key]: !config[key] })}
            className={`flex-1 flex items-center justify-center py-1.5 rounded border transition-colors ${
              config[key]
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-background border-border text-text-secondary hover:text-text-primary"
            }`}
          >
            <Icon size={13} />
          </button>
        ))}
      </div>
    </div>
    <div>
      <label className={labelClass}>Font family</label>
      <select className={inputClass} value={config.fontFamily} onChange={(e) => onChange({ ...config, fontFamily: e.target.value })}>
        <option value="Inter">Inter</option>
        <option value="Roboto">Roboto</option>
        <option value="Helvetica">Helvetica</option>
        <option value="Arial">Arial</option>
        <option value="Open Sans">Open Sans</option>
        <option value="Montserrat">Montserrat</option>
      </select>
    </div>
  </div>
);

const NotificationFields = ({ config, onChange }: { config: NotificationConfig; onChange: (v: NotificationConfig) => void }) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>Title</label>
      <input className={inputClass} value={config.title} onChange={(e) => onChange({ ...config, title: e.target.value })} />
    </div>
    <div>
      <label className={labelClass}>Message</label>
      <textarea
        className="w-full h-16 bg-background border border-border rounded px-2 py-1 text-xs"
        value={config.message}
        onChange={(e) => onChange({ ...config, message: e.target.value })}
      />
    </div>
    <div>
      <label className={labelClass}>Level</label>
      <select className={inputClass} value={config.level} onChange={(e) => onChange({ ...config, level: e.target.value as NotificationConfig["level"] })}>
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="error">Error</option>
        <option value="success">Success</option>
      </select>
    </div>
    <ColorOpacityInput label="Background color" value={config.backgroundColor} onChange={(rgba) => onChange({ ...config, backgroundColor: rgba })} />
    <ColorOpacityInput label="Text color" value={config.textColor} onChange={(rgba) => onChange({ ...config, textColor: rgba })} />
    <div>
      <label className={labelClass}>Position</label>
      <select
        className={inputClass}
        value={config.position}
        onChange={(e) => onChange({ ...config, position: e.target.value as NotificationConfig["position"] })}
      >
        <option value="top-left">Top-left</option>
        <option value="top-right">Top-right</option>
        <option value="bottom-left">Bottom-left</option>
        <option value="bottom-right">Bottom-right</option>
        <option value="center">Center</option>
      </select>
    </div>
    <div>
      <label className={labelClass}>Auto-dismiss after (seconds, 0 = never)</label>
      <input
        type="number"
        min={0}
        className={inputClass}
        value={config.displayDurationSeconds}
        onChange={(e) =>
          onChange({ ...config, displayDurationSeconds: Math.max(0, Number(e.target.value) || 0) })
        }
      />
    </div>
  </div>
);

const DatasetViewFields = ({ config, onChange }: { config: DatasetViewConfig; onChange: (v: DatasetViewConfig) => void }) => {
  const setColumns = (columns: string[]) => {
    const rows = config.rows.map((row) => {
      const next = columns.map((_, i) => row[i] ?? "");
      return next;
    });
    onChange({ ...config, columns, rows });
  };
  return (
    <div className={sectionClass}>
      <div>
        <label className={labelClass}>Title</label>
        <input className={inputClass} value={config.title} onChange={(e) => onChange({ ...config, title: e.target.value })} />
      </div>
      <div>
        <label className={labelClass}>Columns</label>
        <div className="space-y-1">
          {config.columns.map((col, i) => (
            <div key={i} className="flex gap-1">
              <input
                className={`${inputClass} flex-1`}
                value={col}
                onChange={(e) => {
                  const next = [...config.columns];
                  next[i] = e.target.value;
                  setColumns(next);
                }}
              />
              <button
                type="button"
                className={smallBtnClass}
                onClick={() => setColumns(config.columns.filter((_, idx) => idx !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className={smallBtnClass}
            onClick={() => setColumns([...config.columns, `Col ${config.columns.length + 1}`])}
          >
            + Add column
          </button>
        </div>
      </div>
      <div>
        <label className={labelClass}>Rows</label>
        <div className="space-y-1">
          {config.rows.map((row, ri) => (
            <div key={ri} className="flex gap-1 items-start">
              <div className="flex flex-1 gap-1">
                {config.columns.map((_, ci) => (
                  <input
                    key={ci}
                    className={`${inputClass} flex-1`}
                    value={row[ci] ?? ""}
                    onChange={(e) => {
                      const nextRows = config.rows.map((r) => [...r]);
                      nextRows[ri][ci] = e.target.value;
                      onChange({ ...config, rows: nextRows });
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                className={smallBtnClass}
                onClick={() => onChange({ ...config, rows: config.rows.filter((_, idx) => idx !== ri) })}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className={smallBtnClass}
            onClick={() =>
              onChange({ ...config, rows: [...config.rows, config.columns.map(() => "")] })
            }
          >
            + Add row
          </button>
        </div>
      </div>
      <ColorOpacityInput label="Header background" value={config.headerBackground} onChange={(rgba) => onChange({ ...config, headerBackground: rgba })} />
      <ColorOpacityInput label="Row background" value={config.rowBackground} onChange={(rgba) => onChange({ ...config, rowBackground: rgba })} />
      <ColorOpacityInput label="Row text color" value={config.rowTextColor} onChange={(rgba) => onChange({ ...config, rowTextColor: rgba })} />
    </div>
  );
};

const ShellCommandFields = ({ config, onChange }: { config: ShellCommandConfig; onChange: (v: ShellCommandConfig) => void }) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>Command</label>
      <input className={inputClass} value={config.command} onChange={(e) => onChange({ ...config, command: e.target.value })} />
    </div>
    <div>
      <label className={labelClass}>Output</label>
      <textarea
        className="w-full h-24 bg-background border border-border rounded px-2 py-1 text-xs font-mono"
        value={config.output}
        onChange={(e) => onChange({ ...config, output: e.target.value })}
      />
    </div>
    <ColorOpacityInput label="Background color" value={config.backgroundColor} onChange={(rgba) => onChange({ ...config, backgroundColor: rgba })} />
  </div>
);

const SpacerFields = ({ config, onChange }: { config: SpacerConfig; onChange: (v: SpacerConfig) => void }) => (
  <div className={sectionClass}>
    <ColorOpacityInput label="Background color" value={config.backgroundColor} onChange={(rgba) => onChange({ ...config, backgroundColor: rgba })} />
  </div>
);

const GRAPHICS_SHAPES: { type: GraphicsShapeType; icon: React.ComponentType<{ size?: number | string }>; label: string }[] = [
  { type: "rectangle", icon: Square, label: "Rectangle" },
  { type: "circle", icon: CircleIcon, label: "Circle" },
  { type: "triangle", icon: Triangle, label: "Triangle" },
  { type: "star", icon: Star, label: "Star" },
  { type: "arrow", icon: ArrowRight, label: "Arrow" },
  { type: "polygon", icon: Hexagon, label: "Polygon" },
];

const GRAPHICS_EMOJIS = ["😀", "🎉", "❤️", "⭐", "🔥", "👍", "🎬", "🎵"];

const GraphicsFields = ({ config, onChange }: { config: GraphicsWidgetConfig; onChange: (v: GraphicsWidgetConfig) => void }) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>Mode</label>
      <div className="flex gap-1">
        {(["shape", "emoji"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange({ ...config, mode: m })}
            className={`flex-1 py-1.5 text-[11px] rounded border transition-colors ${
              config.mode === m
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-background border-border text-text-secondary hover:text-text-primary"
            }`}
          >
            {m === "shape" ? "Shape" : "Emoji"}
          </button>
        ))}
      </div>
    </div>

    {config.mode === "shape" && (
      <>
        <div>
          <label className={labelClass}>Shape</label>
          <div className="grid grid-cols-3 gap-1">
            {GRAPHICS_SHAPES.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                type="button"
                title={label}
                onClick={() => onChange({ ...config, shapeType: type })}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded border transition-colors ${
                  config.shapeType === type
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-background border-border text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon size={16} />
                <span className="text-[9px]">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <ColorOpacityInput label="Fill" value={config.backgroundColor} onChange={(rgba) => onChange({ ...config, backgroundColor: rgba })} />
        <ColorOpacityInput label="Border color" value={config.borderColor} onChange={(rgba) => onChange({ ...config, borderColor: rgba })} />
        <div>
          <label className={labelClass}>Border width (px)</label>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={config.borderWidth}
            onChange={(e) => onChange({ ...config, borderWidth: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
        {config.shapeType === "rectangle" && (
          <div>
            <label className={labelClass}>Corner radius (px)</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={config.borderRadius}
              onChange={(e) => onChange({ ...config, borderRadius: Math.max(0, Number(e.target.value) || 0) })}
            />
          </div>
        )}
      </>
    )}

    {config.mode === "emoji" && (
      <>
        <div>
          <label className={labelClass}>Emoji</label>
          <div className="grid grid-cols-4 gap-1 mb-2">
            {GRAPHICS_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onChange({ ...config, emoji: e })}
                className={`aspect-square rounded border text-xl transition-colors ${
                  config.emoji === e
                    ? "bg-primary/15 border-primary/40"
                    : "bg-background border-border hover:border-primary/40"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            className={inputClass}
            value={config.emoji}
            placeholder="Or paste any emoji"
            onChange={(e) => onChange({ ...config, emoji: e.target.value })}
          />
        </div>
        <ColorOpacityInput label="Background" value={config.backgroundColor} onChange={(rgba) => onChange({ ...config, backgroundColor: rgba })} />
        <div>
          <label className={labelClass}>Corner radius (px)</label>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={config.borderRadius}
            onChange={(e) => onChange({ ...config, borderRadius: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
      </>
    )}
  </div>
);

const VideoInFields = ({ config, onChange }: { config: VideoInConfig; onChange: (v: VideoInConfig) => void }) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>Source</label>
      <select className={inputClass} value={config.sourceName} onChange={(e) => onChange({ ...config, sourceName: e.target.value })}>
        <option value="HDMI Input">HDMI Input</option>
        <option value="SDI Input">SDI Input</option>
        <option value="USB Camera">USB Camera</option>
        <option value="Network Stream">Network Stream</option>
      </select>
    </div>
    <div>
      <label className={labelClass}>Status</label>
      <input className={inputClass} value={config.status} onChange={(e) => onChange({ ...config, status: e.target.value })} />
    </div>
  </div>
);

const HLSFields = ({ config, onChange }: { config: HLSConfig; onChange: (v: HLSConfig) => void }) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>Stream URL (.m3u8)</label>
      <input className={inputClass} value={config.streamUrl} onChange={(e) => onChange({ ...config, streamUrl: e.target.value })} placeholder="https://.../playlist.m3u8" />
    </div>
    <label className="text-xs flex items-center gap-2">
      <input type="checkbox" checked={config.autoplay} onChange={(e) => onChange({ ...config, autoplay: e.target.checked })} />Autoplay
    </label>
    <label className="text-xs flex items-center gap-2">
      <input type="checkbox" checked={config.muted} onChange={(e) => onChange({ ...config, muted: e.target.checked })} />Muted
    </label>
  </div>
);

const HtmlPackageFields = ({ config, onChange }: { config: HtmlPackageConfig; onChange: (v: HtmlPackageConfig) => void }) => (
  <div className={sectionClass}>
    <p className="text-[10px] text-text-muted">
      Inline HTML rendered in a sandboxed iframe.
    </p>
    <textarea
      className="w-full h-48 bg-background border border-border rounded px-2 py-1 text-xs font-mono"
      value={config.html}
      onChange={(e) => onChange({ ...config, html: e.target.value })}
      spellCheck={false}
      placeholder="<div>...</div>"
    />
  </div>
);

const ImageFields = ({ config, onChange }: { config: ImageWidgetConfig; onChange: (v: ImageWidgetConfig) => void }) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>Image URL</label>
      <input className={inputClass} value={config.imageUrl} onChange={(e) => onChange({ ...config, imageUrl: e.target.value })} placeholder="https://..." />
    </div>
    <LibraryAssetField
      filter="image"
      label="or pick from library"
      currentUrl={config.imageUrl}
      onPick={(item) => {
        const url = resolveLibraryAssetUrl(item);
        if (url) onChange({ ...config, imageUrl: url, libraryMedia: toLibraryMediaRef(item, url) });
      }}
    />
    <div>
      <label className={labelClass}>Object fit</label>
      <select className={inputClass} value={config.objectFit} onChange={(e) => onChange({ ...config, objectFit: e.target.value as ImageWidgetConfig["objectFit"] })}>
        <option value="cover">Cover</option>
        <option value="contain">Contain</option>
      </select>
    </div>
    <ColorOpacityInput label="Background color" value={config.backgroundColor} onChange={(rgba) => onChange({ ...config, backgroundColor: rgba })} />
  </div>
);

const VideoFields = ({ config, onChange }: { config: VideoWidgetConfig; onChange: (v: VideoWidgetConfig) => void }) => (
  <div className={sectionClass}>
    <div>
      <label className={labelClass}>Video URL</label>
      <input className={inputClass} value={config.videoUrl} onChange={(e) => onChange({ ...config, videoUrl: e.target.value })} placeholder="https://..." />
    </div>
    <LibraryAssetField
      filter="video"
      label="or pick from library"
      currentUrl={config.videoUrl}
      onPick={(item) => {
        const url = resolveLibraryAssetUrl(item);
        if (url) onChange({ ...config, videoUrl: url, libraryMedia: toLibraryMediaRef(item, url) });
      }}
    />
    <div>
      <label className={labelClass}>Object fit</label>
      <select className={inputClass} value={config.objectFit} onChange={(e) => onChange({ ...config, objectFit: e.target.value as VideoWidgetConfig["objectFit"] })}>
        <option value="cover">Cover</option>
        <option value="contain">Contain</option>
        <option value="fill">Fill</option>
      </select>
    </div>
    <ColorOpacityInput label="Background color" value={config.backgroundColor} onChange={(rgba) => onChange({ ...config, backgroundColor: rgba })} />
    <label className="text-xs flex items-center gap-2">
      <input type="checkbox" checked={config.loop} onChange={(e) => onChange({ ...config, loop: e.target.checked })} />Loop
    </label>
    <label className="text-xs flex items-center gap-2">
      <input type="checkbox" checked={config.muted} onChange={(e) => onChange({ ...config, muted: e.target.checked })} />Muted
    </label>
    <label className="text-xs flex items-center gap-2">
      <input type="checkbox" checked={config.autoplay} onChange={(e) => onChange({ ...config, autoplay: e.target.checked })} />Autoplay
    </label>
  </div>
);

const AudioFields = ({ config, onChange }: { config: AudioWidgetConfig; onChange: (v: AudioWidgetConfig) => void }) => {
  const toggle = (key: "autoplay" | "loop" | "muted" | "hideUI", label: string, help?: string) => (
    <label className="flex items-start gap-2 text-xs text-text-secondary cursor-pointer">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={config[key]}
        onChange={(e) => onChange({ ...config, [key]: e.target.checked })}
      />
      <span className="flex flex-col">
        <span className="text-text-primary">{label}</span>
        {help && <span className="text-[10px] text-text-muted">{help}</span>}
      </span>
    </label>
  );
  return (
    <div className={sectionClass}>
      <div>
        <label className={labelClass}>Audio URL</label>
        <input className={inputClass} value={config.audioUrl} onChange={(e) => onChange({ ...config, audioUrl: e.target.value })} placeholder="https://..." />
      </div>
      <LibraryAssetField
        filter="audio"
        label="or pick from library"
        currentUrl={config.audioUrl}
        onPick={(item) => {
          const url = resolveLibraryAssetUrl(item);
          if (!url) return;
          onChange({
            ...config,
            audioUrl: url,
            title: config.title && config.title.length > 0 ? config.title : item.name,
            libraryMedia: toLibraryMediaRef(item, url),
          });
        }}
      />
      <div>
        <label className={labelClass}>Title (optional)</label>
        <input
          className={inputClass}
          value={config.title ?? ""}
          onChange={(e) => onChange({ ...config, title: e.target.value || undefined })}
          placeholder="Leave blank to hide"
        />
      </div>
      <div>
        <label className={labelClass}>Volume — {Math.round((config.volume ?? 1) * 100)}%</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={config.volume ?? 1}
          className="w-full"
          onChange={(e) => onChange({ ...config, volume: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-1.5 pt-1">
        {toggle("autoplay", "Autoplay", "Start when the widget mounts.")}
        {toggle("loop", "Loop", "Restart when playback ends.")}
        {toggle("muted", "Muted", "Required by browsers for autoplay without user interaction.")}
        {toggle("hideUI", "Hide UI", "Hide the title/source card and let audio play invisibly.")}
      </div>
    </div>
  );
};

export default WidgetInspector;
