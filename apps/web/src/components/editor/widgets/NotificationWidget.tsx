import React, { useEffect, useState } from "react";
import type { NotificationConfig } from "../../../types/widgets";

const ACCENT: Record<NotificationConfig["level"], string> = {
  info: "#3b82f6",
  warning: "#f59e0b",
  error: "#ef4444",
  success: "#22c55e",
};

const ICON: Record<NotificationConfig["level"], string> = {
  info: "ℹ️",
  warning: "⚠️",
  error: "⛔",
  success: "✅",
};

const positionClass = (position: NotificationConfig["position"]): string => {
  switch (position) {
    case "top-left":
      return "items-start justify-start";
    case "top-right":
      return "items-start justify-end";
    case "bottom-left":
      return "items-end justify-start";
    case "bottom-right":
      return "items-end justify-end";
    case "center":
    default:
      return "items-center justify-center";
  }
};

interface NotificationWidgetProps {
  config: NotificationConfig;
}

export const NotificationWidget: React.FC<NotificationWidgetProps> = ({ config }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    if (!config.displayDurationSeconds || config.displayDurationSeconds <= 0) return;
    const timer = window.setTimeout(
      () => setVisible(false),
      config.displayDurationSeconds * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [
    config.displayDurationSeconds,
    config.title,
    config.message,
    config.level,
  ]);

  if (!visible) return null;

  const accent = ACCENT[config.level];
  const icon = ICON[config.level];

  return (
    <div className={`w-full h-full p-3 flex ${positionClass(config.position)}`}>
      <div
        className="rounded-md p-3 max-w-full transition-opacity duration-200"
        style={{
          backgroundColor: config.backgroundColor,
          color: config.textColor,
          borderLeft: `4px solid ${accent}`,
        }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden>{icon}</span>
          <span>{config.title}</span>
        </div>
        {config.message && <div className="text-xs mt-1">{config.message}</div>}
      </div>
    </div>
  );
};

export default NotificationWidget;
