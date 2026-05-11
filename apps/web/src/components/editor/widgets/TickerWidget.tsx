import React, { useEffect, useMemo, useState } from "react";
import type { TickerConfig } from "../../../types/widgets";

interface TickerWidgetProps {
  config: TickerConfig;
}

export const TickerWidget: React.FC<TickerWidgetProps> = ({ config }) => {
  const [text, setText] = useState(config.text);

  useEffect(() => {
    setText(config.text);
  }, [config.text]);

  useEffect(() => {
    if (!config.dataSource) return;

    let mounted = true;
    const loadText = async () => {
      try {
        const response = await fetch(config.dataSource!);
        const payload = await response.text();
        if (mounted) setText(payload);
      } catch (error) {
        console.error("Ticker source fetch failed", error);
      }
    };

    loadText();
    const ms = Math.max(1, config.refreshInterval ?? 60) * 1000;
    const timer = window.setInterval(loadText, ms);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [config.dataSource, config.refreshInterval]);

  const displayText = text && text.trim().length > 0 ? text : "Ticker";

  // Scroll duration scales inversely with `speed`. speed=50 → ~20s for a full loop.
  const duration = useMemo(() => {
    const safeSpeed = Math.max(1, config.speed || 50);
    const charCount = Math.max(20, displayText.length);
    return `${Math.max(6, (charCount * 1000) / (safeSpeed * 6))}s`;
  }, [config.speed, displayText.length]);

  return (
    <div
      className="w-full h-full flex items-center overflow-hidden relative"
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
        fontFamily: config.fontFamily || "Inter, sans-serif",
        fontSize: config.fontSize,
      }}
    >
      <div
        className="whitespace-nowrap"
        style={{
          display: "inline-block",
          paddingLeft: "100%",
          animation: `ticker-scroll ${duration} linear infinite`,
        }}
      >
        <span style={{ paddingRight: "4em", display: "inline-block" }}>
          {displayText}
        </span>
        <span style={{ paddingRight: "4em", display: "inline-block" }}>
          {displayText}
        </span>
      </div>
      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default TickerWidget;
