import React, { useEffect, useState } from "react";
import Marquee from "react-fast-marquee";
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

  return (
    <div
      className="w-full h-full flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
        fontFamily: config.fontFamily || "Inter, sans-serif",
        fontSize: config.fontSize,
      }}
    >
      <Marquee speed={config.speed} gradient={false} style={{ width: "100%" }}>
        <span
          className="px-4 py-2"
          style={{ paddingRight: "100px", whiteSpace: "nowrap", display: "inline-block" }}
        >
          {text}
        </span>
      </Marquee>
    </div>
  );
};

export default TickerWidget;
