import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Globe, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { IframeConfig } from "../../../types/widgets";

interface IframeWidgetProps {
  config: IframeConfig;
  /** When false, a transparent overlay covers the iframe so the parent can capture drag/select events. */
  interactive?: boolean;
}

export const IframeWidget: React.FC<IframeWidgetProps> = ({ config, interactive = false }) => {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerSize({
          width: entries[0].contentRect.width || 1,
          height: entries[0].contentRect.height || 1,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const normalizedSrc = useMemo(() => {
    const raw = (config.src || "").trim();
    if (!raw) return "";
    const withProtocol =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? raw
        : `https://${raw}`;
    try {
      const url = new URL(withProtocol);
      const host = url.hostname.toLowerCase();
      const path = url.pathname;

      // Convert common Google Docs edit/view links to preview links that are embeddable more often.
      if (host.includes("docs.google.com")) {
        if (path.includes("/document/") || path.includes("/presentation/")) {
          url.pathname = path.replace(/\/edit.*$/, "/preview");
          url.search = "";
          return url.toString();
        }
        if (path.includes("/spreadsheets/")) {
          url.pathname = path.replace(/\/edit.*$/, "/preview");
          return url.toString();
        }
      }

      return url.toString();
    } catch {
      return withProtocol;
    }
  }, [config.src]);

  const [timerId, setTimerId] = useState<number | null>(null);

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
    if (!normalizedSrc) return;
    const timer = window.setTimeout(() => {
      setTimedOut(true);
    }, 8000);
    setTimerId(timer);
    return () => window.clearTimeout(timer);
  }, [normalizedSrc]);

  // Clear timeout if the iframe triggers onload before the 8s mark
  useEffect(() => {
    if (loaded && timerId) {
      window.clearTimeout(timerId);
    }
  }, [loaded, timerId]);

  useEffect(() => {
    if (!normalizedSrc) return;
    if (config.renderMode === "iframe") return;
    const intervalSec = Math.max(5, config.snapshotRefreshInterval || 30);
    const timer = window.setInterval(() => {
      setRefreshToken((v) => v + 1);
    }, intervalSec * 1000);
    return () => window.clearInterval(timer);
  }, [normalizedSrc, config.renderMode, config.snapshotRefreshInterval]);

  const snapshotSrc = useMemo(() => {
    if (!normalizedSrc) return "";
    const encoded = encodeURIComponent(normalizedSrc);
    return `https://image.thum.io/get/width/1600/noanimate/${encoded}?v=${refreshToken}`;
  }, [normalizedSrc, refreshToken]);

  const showIframe =
    normalizedSrc &&
    (config.renderMode === "iframe" ||
      (config.renderMode === "auto" && !timedOut));
  const showSnapshot =
    normalizedSrc &&
    (config.renderMode === "snapshot" ||
      (config.renderMode === "auto" && timedOut));

  const zoom = config.zoom || 1;
  const isTransparent = config.transparentBackground;

  // Auto-fit calculation: Base virtual width is 1280px (desktop) modified by zoom
  const virtualWidth = 1280 / zoom;
  const scale = containerSize.width / virtualWidth;
  const virtualHeight = containerSize.height / scale;

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative"
      style={{
        borderRadius: config.borderRadius,
        backgroundColor: isTransparent ? "transparent" : "#000",
      }}
    >
      {/* Scaled Container for Iframe / Content */}
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: `${virtualWidth}px`,
          height: `${virtualHeight}px`,
          transform: `scale(${scale})`,
        }}
      >
        {showIframe && (
          <iframe
            {...{ credentialless: "true" }}
            src={normalizedSrc}
            title={config.title || "Embedded frame"}
            className="w-full h-full border-0"
            allowFullScreen={config.allowFullscreen}
            sandbox={config.sandbox || undefined}
            referrerPolicy="no-referrer-when-downgrade"
            loading="eager"
            onLoad={() => setLoaded(true)}
            style={{ backgroundColor: isTransparent ? "transparent" : "#fff" }}
          />
        )}
        {showSnapshot && (
          <img
            src={snapshotSrc}
            alt={config.title || "Website snapshot"}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            onLoad={() => setLoaded(true)}
          />
        )}
      </div>

      {/* Empty State */}
      {!normalizedSrc && (
        <div className="w-full h-full flex flex-col items-center justify-center text-xs text-text-muted bg-background-tertiary">
          <Globe className="w-8 h-8 opacity-20 mb-2" />
          <span>Enter a URL to preview</span>
        </div>
      )}

      {/* Premium Loading Overlay */}
      <AnimatePresence>
        {!loaded && showIframe && normalizedSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-white text-xs font-medium tracking-wide">
              Loading Live Preview...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pointer-capture overlay — lets the editor select / drag the widget when it's not the selected target. */}
      {!interactive && normalizedSrc && (
        <div className="absolute inset-0 z-30" aria-hidden />
      )}

      {/* Status Badges */}
      <div className="absolute top-2 right-2 flex gap-2 z-20">
        {loaded && showIframe && (
          <div className="px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 backdrop-blur text-[10px] text-emerald-200 flex items-center shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
            Live Preview
          </div>
        )}
        {timedOut && loaded && showSnapshot && (
          <div className="px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 backdrop-blur text-[10px] text-amber-200 flex items-center shadow-lg">
            <AlertCircle className="w-3 h-3 mr-1" />
            Snapshot Fallback
          </div>
        )}
      </div>
    </div>
  );
};

export default IframeWidget;
