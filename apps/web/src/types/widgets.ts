export type SignageWidgetType =
  | "audio"
  | "calendar"
  | "chart"
  | "clock"
  | "countdown"
  | "datasetView"
  | "graphics"
  | "hls"
  | "htmlPackage"
  | "image"
  | "iframe"
  | "notification"
  | "pdf"
  | "powerpoint"
  | "shellCommand"
  | "spacer"
  | "text"
  | "ticker"
  | "video"
  | "videoIn";

export type GraphicsShapeType =
  | "rectangle"
  | "circle"
  | "triangle"
  | "star"
  | "arrow"
  | "polygon";

export interface GraphicsWidgetConfig {
  mode: "shape" | "emoji";
  shapeType: GraphicsShapeType;
  emoji: string;
  /** rgba(r,g,b,a) — fill color (shape) or container background (emoji). */
  backgroundColor: string;
  /** rgba(r,g,b,a) — stroke color (shape mode only). */
  borderColor: string;
  /** px */
  borderWidth: number;
  /** px — applied to rectangle (shape mode) and the container (emoji mode). */
  borderRadius: number;
}

export interface CalendarConfig {
  calendarUrl: string;
  displayMode: "month" | "week" | "day";
  refreshInterval: number;
}

export interface ChartConfig {
  chartType: "bar" | "line" | "pie" | "donut";
  dataSource: "manual" | "api";
  apiUrl?: string;
  refreshInterval?: number;
  data: { label: string; value: number }[];
  colors: string[];
  title?: string;
}

export interface ClockConfig {
  format: "12h" | "24h";
  clockType?: "digital" | "analog";
  timezone: string;
  showSeconds: boolean;
  fontFamily: string;
  fontSize: number;
  color: string;
  position: { x: number; y: number };
}

export interface CountdownConfig {
  targetDateTime: string;
  format: "DD:HH:MM:SS" | "HH:MM:SS" | "MM:SS";
  completedMessage: string;
  fontSize: number;
  color: string;
  position: { x: number; y: number };
}

export interface PDFConfig {
  file: File | null;
  /** Optional URL of a hosted PDF used as a fallback when `file` is null (e.g. on JSON replay). */
  fileUrl?: string;
  secondsPerPage: number;
  totalPages: number;
  loop: boolean;
  fit: "fill" | "contain" | "actual";
  showPageIndicator: boolean;
  transition: "none" | "fade" | "slide";
}

export interface PowerPointConfig {
  file: File | null;
  /** Optional URL of a hosted PDF rendition of the slideshow used as a fallback when `file` is null (e.g. on JSON replay). */
  fileUrl?: string;
  secondsPerSlide: number;
  totalSlides: number;
  loop: boolean;
  fit: "fill" | "contain" | "actual";
  showPageIndicator: boolean;
  transition: "none" | "fade" | "slide";
}

export interface TickerConfig {
  /** "text" uses `text`; "list" joins `entries` with a bullet separator. */
  mode: "text" | "list";
  text: string;
  entries: string[];
  /** Optional heading shown when mode === "list". */
  title?: string;
  speed: number;
  /** rgba(r,g,b,a) string. */
  backgroundColor: string;
  /** rgba(r,g,b,a) string. */
  textColor: string;
  fontFamily?: string;
  fontSize: number;
  position: "top" | "bottom";
  dataSource?: string;
  refreshInterval?: number;
}

export interface IframeConfig {
  src: string;
  title: string;
  allowFullscreen: boolean;
  renderMode: "iframe" | "snapshot" | "auto";
  snapshotRefreshInterval: number;
  sandbox:
    | ""
    | "allow-scripts"
    | "allow-same-origin"
    | "allow-scripts allow-same-origin";
  borderRadius: number;
  zoom: number;
  transparentBackground: boolean;
}

export interface TextWidgetConfig {
  text: string;
  fontSize: number;
  /** rgba(r,g,b,a) string. */
  color: string;
  /** rgba(r,g,b,a) string. */
  backgroundColor: string;
  textAlign: "left" | "center" | "right";
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface NotificationConfig {
  title: string;
  message: string;
  level: "info" | "warning" | "error" | "success";
  /** rgba(r,g,b,a) string. */
  backgroundColor: string;
  /** rgba(r,g,b,a) string. */
  textColor: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  /** Seconds. 0 = never auto-dismiss. */
  displayDurationSeconds: number;
}

export interface SpacerConfig {
  /** rgba(r,g,b,a) string. */
  backgroundColor: string;
}

export interface ShellCommandConfig {
  command: string;
  output: string;
  /** rgba(r,g,b,a) string. */
  backgroundColor: string;
}

export interface DatasetViewConfig {
  title: string;
  columns: string[];
  rows: string[][];
  /** rgba(r,g,b,a) string. */
  headerBackground: string;
  /** rgba(r,g,b,a) string. */
  rowBackground: string;
  /** rgba(r,g,b,a) string. */
  rowTextColor: string;
}

export interface VideoInConfig {
  sourceName: string;
  status: string;
}

export interface HLSConfig {
  streamUrl: string;
  autoplay: boolean;
  muted: boolean;
}

export interface HtmlPackageConfig {
  html: string;
}

export interface ImageWidgetConfig {
  imageUrl: string;
  objectFit: "cover" | "contain";
  /** rgba(r,g,b,a) string. */
  backgroundColor: string;
}

export interface VideoWidgetConfig {
  videoUrl: string;
  loop: boolean;
  muted: boolean;
  autoplay: boolean;
  objectFit: "cover" | "contain" | "fill";
  /** rgba(r,g,b,a) string. */
  backgroundColor: string;
}

export interface AudioWidgetConfig {
  audioUrl: string;
  title?: string;
}

export type WidgetConfig =
  | AudioWidgetConfig
  | CalendarConfig
  | ChartConfig
  | ClockConfig
  | CountdownConfig
  | DatasetViewConfig
  | GraphicsWidgetConfig
  | HLSConfig
  | HtmlPackageConfig
  | ImageWidgetConfig
  | IframeConfig
  | NotificationConfig
  | PDFConfig
  | PowerPointConfig
  | ShellCommandConfig
  | SpacerConfig
  | TextWidgetConfig
  | TickerConfig
  | VideoInConfig
  | VideoWidgetConfig;

export interface SignageWidget {
  id: string;
  type: SignageWidgetType;
  startTime: number;
  duration: number;
  config: WidgetConfig;
  locked?: boolean;
  hidden?: boolean;
  layout?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
