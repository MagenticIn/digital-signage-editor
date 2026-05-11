import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import type { CountdownConfig } from "../../../types/widgets";

interface CountdownWidgetProps {
  config: CountdownConfig;
}

const pad = (v: number): string => String(v).padStart(2, "0");

export const CountdownWidget: React.FC<CountdownWidgetProps> = ({ config }) => {
  const [now, setNow] = useState(dayjs());
  const [fittedFontSize, setFittedFontSize] = useState(config.fontSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(dayjs()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const text = useMemo(() => {
    const target = dayjs(config.targetDateTime);
    const diff = Math.max(0, target.diff(now, "second"));

    if (diff <= 0) return config.completedMessage;

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (config.format === "DD:HH:MM:SS") {
      return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    if (config.format === "HH:MM:SS") {
      return `${pad(hours + days * 24)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes + (hours + days * 24) * 60)}:${pad(seconds)}`;
  }, [config, now]);

  useEffect(() => {
    const fitText = () => {
      const container = containerRef.current;
      const textEl = textRef.current;
      if (!container || !textEl) return;

      const availableWidth = Math.max(60, container.clientWidth - 16);
      const availableHeight = Math.max(24, container.clientHeight - 16);

      let nextSize = config.fontSize;
      textEl.style.fontSize = `${nextSize}px`;
      textEl.style.lineHeight = "1.1";

      while (
        nextSize > 10 &&
        (textEl.scrollWidth > availableWidth || textEl.scrollHeight > availableHeight)
      ) {
        nextSize -= 1;
        textEl.style.fontSize = `${nextSize}px`;
      }

      setFittedFontSize(nextSize);
    };

    fitText();
    const observer = new ResizeObserver(fitText);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [config.fontSize, text]);

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-none"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        ref={textRef}
        style={{
          maxWidth: "calc(100% - 16px)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: config.color,
          fontSize: fittedFontSize,
          lineHeight: 1.1,
          display: "inline-block",
        }}
      >
        {text}
      </span>
    </div>
  );
};

export default CountdownWidget;
