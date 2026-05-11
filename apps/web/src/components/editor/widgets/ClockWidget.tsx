import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { ClockConfig } from "../../../types/widgets";

dayjs.extend(utc);
dayjs.extend(timezone);

interface ClockWidgetProps {
  config: ClockConfig;
}

export const ClockWidget: React.FC<ClockWidgetProps> = ({ config }) => {
  const [now, setNow] = useState(dayjs());
  const [fittedFontSize, setFittedFontSize] = useState(config.fontSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(dayjs()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formatToken = config.format === "12h"
    ? config.showSeconds
      ? "hh:mm:ss A"
      : "hh:mm A"
    : config.showSeconds
      ? "HH:mm:ss"
      : "HH:mm";
  const time = now.tz(config.timezone);
  const timeText = time.format(formatToken);

  useEffect(() => {
    if (config.clockType === "analog") return;
    const fitText = () => {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) return;

      const availableWidth = Math.max(60, container.clientWidth - 16);
      const availableHeight = Math.max(24, container.clientHeight - 16);

      let nextSize = config.fontSize;
      text.style.fontSize = `${nextSize}px`;
      text.style.lineHeight = "1.1";

      while (
        nextSize > 10 &&
        (text.scrollWidth > availableWidth || text.scrollHeight > availableHeight)
      ) {
        nextSize -= 1;
        text.style.fontSize = `${nextSize}px`;
      }

      setFittedFontSize(nextSize);
    };

    fitText();
    const observer = new ResizeObserver(fitText);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [config.fontSize, timeText, config.clockType]);

  const renderAnalog = () => {
    const h = time.hour() % 12;
    const m = time.minute();
    const s = time.second();

    const hDeg = (h * 30) + (m * 0.5);
    const mDeg = (m * 6) + (s * 0.1);
    const sDeg = s * 6;

    return (
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", padding: "8px" }}>
        <circle cx="50" cy="50" r="45" stroke={config.color} strokeWidth="2" fill="transparent" />
        {[...Array(12)].map((_, i) => (
          <line
            key={i}
            x1="50" y1="10" x2="50" y2="15"
            stroke={config.color}
            strokeWidth={i % 3 === 0 ? "2" : "1"}
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}
        <line x1="50" y1="50" x2="50" y2="25" stroke={config.color} strokeWidth="3" strokeLinecap="round" transform={`rotate(${hDeg} 50 50)`} />
        <line x1="50" y1="50" x2="50" y2="15" stroke={config.color} strokeWidth="2" strokeLinecap="round" transform={`rotate(${mDeg} 50 50)`} />
        {config.showSeconds && (
          <line x1="50" y1="50" x2="50" y2="10" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" transform={`rotate(${sDeg} 50 50)`} />
        )}
        <circle cx="50" cy="50" r="2" fill={config.color} />
      </svg>
    );
  };

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
      {config.clockType === "analog" ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-2 py-2">
          <div className="flex-1 w-full min-h-0">{renderAnalog()}</div>
          <span
            style={{
              color: config.color,
              fontSize: Math.max(10, Math.floor(config.fontSize * 0.3)),
              fontFamily: config.fontFamily,
              lineHeight: 1.1,
            }}
          >
            {config.timezone}
          </span>
        </div>
      ) : (
        <span
          ref={textRef}
          style={{
            maxWidth: "calc(100% - 16px)",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            color: config.color,
            fontSize: fittedFontSize,
            fontFamily: config.fontFamily,
            lineHeight: 1.1,
            display: "inline-block",
          }}
        >
          {timeText}
        </span>
      )}
    </div>
  );
};

export default ClockWidget;
