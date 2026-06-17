import React from "react";

/**
 * SVG circular progress ring with a centered percentage label, for media
 * upload progress (0→100%).
 */
export const CircularProgress: React.FC<{
  /** Progress 0–100. */
  value: number;
  size?: number;
  strokeWidth?: number;
}> = ({ value, size = 44, strokeWidth = 4 }) => {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-primary/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="fill-none stroke-primary transition-[stroke-dashoffset] duration-200 ease-out"
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <span className="absolute text-[9px] font-medium text-text-primary tabular-nums">
        {Math.round(clamped)}%
      </span>
    </div>
  );
};
