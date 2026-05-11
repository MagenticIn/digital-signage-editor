import { create } from "zustand";
import { normalizeColor } from "../components/editor/widgets/color-utils";
import type {
  AudioWidgetConfig,
  CalendarConfig,
  ChartConfig,
  ClockConfig,
  CountdownConfig,
  DatasetViewConfig,
  HLSConfig,
  HtmlPackageConfig,
  ImageWidgetConfig,
  IframeConfig,
  NotificationConfig,
  PDFConfig,
  PowerPointConfig,
  ShellCommandConfig,
  SignageWidget,
  SignageWidgetType,
  SpacerConfig,
  TextWidgetConfig,
  TickerConfig,
  VideoInConfig,
  VideoWidgetConfig,
  WidgetConfig,
} from "../types/widgets";

type DefaultConfigs = {
  audio: AudioWidgetConfig;
  calendar: CalendarConfig;
  chart: ChartConfig;
  clock: ClockConfig;
  countdown: CountdownConfig;
  datasetView: DatasetViewConfig;
  hls: HLSConfig;
  htmlPackage: HtmlPackageConfig;
  image: ImageWidgetConfig;
  iframe: IframeConfig;
  notification: NotificationConfig;
  pdf: PDFConfig;
  powerpoint: PowerPointConfig;
  shellCommand: ShellCommandConfig;
  spacer: SpacerConfig;
  text: TextWidgetConfig;
  ticker: TickerConfig;
  video: VideoWidgetConfig;
  videoIn: VideoInConfig;
};

interface SignageWidgetState {
  widgets: SignageWidget[];
  addWidget: (widget: SignageWidget) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<SignageWidget>) => void;
  updateWidgetConfig: (id: string, config: WidgetConfig) => void;
}

export const defaultConfigs: DefaultConfigs = {
  audio: {
    audioUrl: "",
    title: "Now Playing",
  },
  calendar: {
    calendarUrl: "",
    displayMode: "month",
    refreshInterval: 300,
  },
  chart: {
    chartType: "bar",
    dataSource: "manual",
    data: [
      { label: "A", value: 12 },
      { label: "B", value: 18 },
      { label: "C", value: 9 },
    ],
    colors: ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"],
    title: "",
    refreshInterval: 30,
  },
  clock: {
    format: "24h",
    clockType: "digital",
    timezone: "Asia/Kolkata",
    showSeconds: true,
    fontFamily: "Inter",
    fontSize: 42,
    color: "#ffffff",
    position: { x: 40, y: 40 },
  },
  countdown: {
    targetDateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    format: "HH:MM:SS",
    completedMessage: "Countdown complete",
    fontSize: 42,
    color: "#ffffff",
    position: { x: 40, y: 90 },
  },
  datasetView: {
    title: "Dataset View",
    columns: ["Name", "Value"],
    rows: [
      ["Alpha", "120"],
      ["Beta", "95"],
      ["Gamma", "140"],
    ],
    headerBackground: "rgba(0,0,0,0)",
    rowBackground: "rgba(0,0,0,0)",
    rowTextColor: "rgba(255,255,255,1)",
  },
  hls: {
    streamUrl: "",
    autoplay: true,
    muted: true,
  },
  htmlPackage: {
    html: "<div style='color:white;font-family:sans-serif;padding:16px'>HTML Package</div>",
  },
  image: {
    imageUrl: "",
    objectFit: "contain",
    backgroundColor: "rgba(0,0,0,0)",
  },
  iframe: {
    src: "https://www.w3schools.com",
    title: "Embedded content",
    allowFullscreen: true,
    renderMode: "auto",
    snapshotRefreshInterval: 30,
    sandbox: "allow-scripts allow-same-origin",
    borderRadius: 8,
    zoom: 1,
    transparentBackground: true,
  },
  notification: {
    title: "Notification",
    message: "Your scheduled content is live.",
    level: "info",
    backgroundColor: "rgba(0,0,0,0)",
    textColor: "rgba(255,255,255,1)",
    position: "top-right",
    displayDurationSeconds: 0,
  },
  pdf: {
    file: null,
    secondsPerPage: 5,
    totalPages: 0,
    loop: true,
    fit: "fill",
    showPageIndicator: true,
    transition: "fade",
  },
  powerpoint: {
    file: null,
    secondsPerSlide: 5,
    totalSlides: 0,
    loop: true,
    fit: "fill",
    showPageIndicator: true,
    transition: "fade",
  },
  shellCommand: {
    command: "echo Digital Signage",
    output: "Digital Signage",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  spacer: {
    backgroundColor: "rgba(255,255,255,1)",
  },
  text: {
    text: "Sample Text Widget",
    fontSize: 32,
    color: "rgba(255,255,255,1)",
    backgroundColor: "rgba(0,0,0,0)",
    textAlign: "center",
    fontFamily: "Inter",
  },
  ticker: {
    mode: "text",
    text: "Welcome to Digital Signage",
    entries: [],
    speed: 50,
    backgroundColor: "rgba(0,0,0,0)",
    textColor: "rgba(255,255,255,1)",
    fontFamily: "Inter",
    fontSize: 24,
    position: "bottom",
    refreshInterval: 60,
  },
  video: {
    videoUrl: "",
    loop: true,
    muted: true,
    autoplay: true,
    objectFit: "contain",
    backgroundColor: "rgba(0,0,0,0)",
  },
  videoIn: {
    sourceName: "HDMI Input",
    status: "No signal",
  },
};

export const cloneDefaultWidgetConfig = (type: SignageWidgetType): WidgetConfig =>
  structuredClone(defaultConfigs[type]);

/**
 * Rewrite legacy widget types and color formats.
 *
 * Mappings:
 * - "webpage" → "iframe" (src copied from config.url)
 * - "embedded" → "iframe" (src copied from config.embedUrl)
 * - "datasetTicker" → "ticker" with mode "list"
 * - "flash" → "notification" carrying the fallback text
 * - "localVideo" → "video" with autoplay forced on
 * - "subPlaylist" → "text" with items joined by newlines
 * - ticker without mode → mode "text"
 * - any "#rrggbb" / "transparent" color value → rgba(...) string
 */
export const migrateWidget = (raw: SignageWidget): SignageWidget => {
  const widget = { ...raw };
  const legacyType = widget.type as
    | SignageWidgetType
    | "webpage"
    | "embedded"
    | "datasetTicker"
    | "flash"
    | "localVideo"
    | "subPlaylist";

  if (legacyType === "webpage") {
    const legacy = widget.config as unknown as { url?: string; title?: string };
    widget.type = "iframe";
    widget.config = {
      ...defaultConfigs.iframe,
      src: legacy.url ?? defaultConfigs.iframe.src,
      title: legacy.title ?? defaultConfigs.iframe.title,
    };
    return widget;
  }

  if (legacyType === "embedded") {
    const legacy = widget.config as unknown as { embedUrl?: string; title?: string };
    widget.type = "iframe";
    widget.config = {
      ...defaultConfigs.iframe,
      src: legacy.embedUrl ?? defaultConfigs.iframe.src,
      title: legacy.title ?? defaultConfigs.iframe.title,
    };
    return widget;
  }

  if (legacyType === "datasetTicker") {
    const legacy = widget.config as unknown as {
      title?: string;
      entries?: string[];
      speed?: number;
      backgroundColor?: string;
      textColor?: string;
    };
    const entries = legacy.entries ?? [];
    widget.type = "ticker";
    widget.config = {
      ...defaultConfigs.ticker,
      mode: "list",
      title: legacy.title,
      entries,
      text: entries.join("   •   "),
      speed: legacy.speed ?? defaultConfigs.ticker.speed,
      backgroundColor: normalizeColor(legacy.backgroundColor ?? defaultConfigs.ticker.backgroundColor),
      textColor: normalizeColor(legacy.textColor ?? defaultConfigs.ticker.textColor),
      fontSize: 22,
      position: "bottom",
    };
    return widget;
  }

  if (legacyType === "flash") {
    const legacy = widget.config as unknown as { fallbackText?: string };
    widget.type = "notification";
    widget.config = {
      ...defaultConfigs.notification,
      title: "Flash content",
      message: legacy.fallbackText ?? "Flash content is not supported.",
      level: "info",
    };
    return widget;
  }

  if (legacyType === "localVideo") {
    const legacy = widget.config as unknown as {
      videoUrl?: string;
      loop?: boolean;
      muted?: boolean;
    };
    widget.type = "video";
    widget.config = {
      ...defaultConfigs.video,
      videoUrl: legacy.videoUrl ?? "",
      loop: legacy.loop ?? true,
      muted: legacy.muted ?? true,
      autoplay: true,
    };
    return widget;
  }

  if (legacyType === "subPlaylist") {
    const legacy = widget.config as unknown as { items?: string[] };
    widget.type = "text";
    widget.config = {
      ...defaultConfigs.text,
      text: (legacy.items ?? []).join("\n"),
    };
    return widget;
  }

  if (widget.type === "ticker") {
    const cfg = widget.config as Partial<TickerConfig>;
    widget.config = {
      ...defaultConfigs.ticker,
      ...cfg,
      mode: cfg.mode ?? "text",
      entries: cfg.entries ?? [],
      backgroundColor: normalizeColor(cfg.backgroundColor ?? defaultConfigs.ticker.backgroundColor),
      textColor: normalizeColor(cfg.textColor ?? defaultConfigs.ticker.textColor),
    } as TickerConfig;
    return widget;
  }

  if (widget.type === "image") {
    const cfg = widget.config as Partial<ImageWidgetConfig>;
    widget.config = {
      imageUrl: cfg.imageUrl ?? "",
      objectFit: cfg.objectFit ?? defaultConfigs.image.objectFit,
      backgroundColor: normalizeColor(cfg.backgroundColor ?? defaultConfigs.image.backgroundColor),
    };
    return widget;
  }

  if (widget.type === "video") {
    const cfg = widget.config as Partial<VideoWidgetConfig>;
    widget.config = {
      videoUrl: cfg.videoUrl ?? "",
      loop: cfg.loop ?? defaultConfigs.video.loop,
      muted: cfg.muted ?? defaultConfigs.video.muted,
      autoplay: cfg.autoplay ?? defaultConfigs.video.autoplay,
      objectFit: cfg.objectFit ?? defaultConfigs.video.objectFit,
      backgroundColor: normalizeColor(cfg.backgroundColor ?? defaultConfigs.video.backgroundColor),
    };
    return widget;
  }

  if (widget.type === "notification") {
    const cfg = widget.config as Partial<NotificationConfig>;
    widget.config = {
      ...defaultConfigs.notification,
      ...cfg,
      backgroundColor: normalizeColor(cfg.backgroundColor ?? defaultConfigs.notification.backgroundColor),
      textColor: normalizeColor(cfg.textColor ?? defaultConfigs.notification.textColor),
      position: cfg.position ?? defaultConfigs.notification.position,
      displayDurationSeconds:
        cfg.displayDurationSeconds ?? defaultConfigs.notification.displayDurationSeconds,
    } as NotificationConfig;
    return widget;
  }

  if (widget.type === "pdf") {
    const cfg = widget.config as Partial<PDFConfig>;
    widget.config = {
      file: cfg.file ?? null,
      fileUrl: cfg.fileUrl,
      secondsPerPage: cfg.secondsPerPage ?? defaultConfigs.pdf.secondsPerPage,
      totalPages: cfg.totalPages ?? 0,
      loop: cfg.loop ?? defaultConfigs.pdf.loop,
      fit: cfg.fit ?? defaultConfigs.pdf.fit,
      showPageIndicator: cfg.showPageIndicator ?? defaultConfigs.pdf.showPageIndicator,
      transition: cfg.transition ?? defaultConfigs.pdf.transition,
    };
    return widget;
  }

  if (widget.type === "powerpoint") {
    const cfg = widget.config as Partial<PowerPointConfig>;
    widget.config = {
      file: cfg.file ?? null,
      fileUrl: cfg.fileUrl,
      secondsPerSlide: cfg.secondsPerSlide ?? defaultConfigs.powerpoint.secondsPerSlide,
      totalSlides: cfg.totalSlides ?? 0,
      loop: cfg.loop ?? defaultConfigs.powerpoint.loop,
      fit: cfg.fit ?? defaultConfigs.powerpoint.fit,
      showPageIndicator: cfg.showPageIndicator ?? defaultConfigs.powerpoint.showPageIndicator,
      transition: cfg.transition ?? defaultConfigs.powerpoint.transition,
    };
    return widget;
  }

  if (widget.type === "audio") {
    const cfg = widget.config as Partial<AudioWidgetConfig>;
    widget.config = {
      audioUrl: cfg.audioUrl ?? "",
      title: cfg.title === "" ? undefined : (cfg.title ?? defaultConfigs.audio.title),
    };
    return widget;
  }

  if (widget.type === "chart") {
    const cfg = widget.config as Partial<ChartConfig>;
    widget.config = {
      chartType: cfg.chartType ?? defaultConfigs.chart.chartType,
      dataSource: cfg.dataSource ?? defaultConfigs.chart.dataSource,
      apiUrl: cfg.apiUrl,
      refreshInterval: cfg.refreshInterval ?? defaultConfigs.chart.refreshInterval,
      data: cfg.data ?? defaultConfigs.chart.data,
      colors: cfg.colors ?? defaultConfigs.chart.colors,
      title: cfg.title === "" ? undefined : cfg.title,
    };
    return widget;
  }

  if (widget.type === "datasetView") {
    const cfg = widget.config as Partial<DatasetViewConfig>;
    widget.config = {
      title: cfg.title ?? defaultConfigs.datasetView.title,
      columns: cfg.columns ?? defaultConfigs.datasetView.columns,
      rows: cfg.rows ?? defaultConfigs.datasetView.rows,
      headerBackground: normalizeColor(cfg.headerBackground ?? defaultConfigs.datasetView.headerBackground),
      rowBackground: normalizeColor(cfg.rowBackground ?? defaultConfigs.datasetView.rowBackground),
      rowTextColor: normalizeColor(cfg.rowTextColor ?? defaultConfigs.datasetView.rowTextColor),
    };
    return widget;
  }

  // Normalize color-bearing fields for the remaining widgets.
  if (widget.type === "text") {
    const cfg = widget.config as TextWidgetConfig;
    widget.config = {
      ...cfg,
      color: normalizeColor(cfg.color),
      backgroundColor: normalizeColor(cfg.backgroundColor),
    };
  } else if (widget.type === "spacer") {
    const cfg = widget.config as SpacerConfig;
    widget.config = { ...cfg, backgroundColor: normalizeColor(cfg.backgroundColor) };
  } else if (widget.type === "shellCommand") {
    const cfg = widget.config as Partial<ShellCommandConfig>;
    widget.config = {
      command: cfg.command ?? defaultConfigs.shellCommand.command,
      output: cfg.output ?? defaultConfigs.shellCommand.output,
      backgroundColor: normalizeColor(cfg.backgroundColor ?? defaultConfigs.shellCommand.backgroundColor),
    };
  }

  return widget;
};

export const migrateWidgets = (raw: SignageWidget[]): SignageWidget[] => raw.map(migrateWidget);

export const useSignageWidgetStore = create<SignageWidgetState>((set) => ({
  widgets: [],
  addWidget: (widget) =>
    set((state) => ({ widgets: [...state.widgets, migrateWidget(widget)] })),
  removeWidget: (id) =>
    set((state) => ({ widgets: state.widgets.filter((widget) => widget.id !== id) })),
  updateWidget: (id, updates) =>
    set((state) => ({
      widgets: state.widgets.map((widget) =>
        widget.id === id ? { ...widget, ...updates } : widget,
      ),
    })),
  updateWidgetConfig: (id, config) =>
    set((state) => ({
      widgets: state.widgets.map((widget) =>
        widget.id === id ? { ...widget, config } : widget,
      ),
    })),
}));
