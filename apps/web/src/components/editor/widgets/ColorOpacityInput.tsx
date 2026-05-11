import React from "react";
import { formatRgba, parseColor, toHex } from "./color-utils";

interface ColorOpacityInputProps {
  value: string;
  onChange: (rgba: string) => void;
  label?: string;
}

const CHECKERBOARD =
  "conic-gradient(#bbb 25%, #ffffff 0 50%, #bbb 0 75%, #ffffff 0) 0 0 / 8px 8px";

export const ColorOpacityInput: React.FC<ColorOpacityInputProps> = ({
  value,
  onChange,
  label,
}) => {
  const rgba = parseColor(value);
  const hex = toHex(rgba);
  const alphaPct = Math.round(rgba.a * 100);

  const emitColor = (nextHex: string) => {
    const next = parseColor(nextHex);
    onChange(formatRgba({ ...next, a: rgba.a }));
  };

  const emitAlpha = (nextAlpha: number) => {
    onChange(formatRgba({ ...rgba, a: nextAlpha }));
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="text-[10px] uppercase tracking-wider text-text-muted">
          {label}
        </div>
      )}
      <div className="space-y-1">
        <label className="text-[10px] text-text-secondary block">Color</label>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border border-border shrink-0"
            style={{ background: CHECKERBOARD }}
            title={formatRgba(rgba)}
          >
            <div
              className="w-full h-full rounded"
              style={{ backgroundColor: formatRgba(rgba) }}
            />
          </div>
          <input
            type="color"
            aria-label="Color"
            className="h-7 flex-1 min-w-0 cursor-pointer border border-border rounded bg-background"
            value={hex}
            onChange={(e) => emitColor(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] text-text-secondary block">
          Opacity ({alphaPct}%)
        </label>
        <input
          type="range"
          aria-label="Opacity"
          min={0}
          max={1}
          step={0.01}
          value={rgba.a}
          onChange={(e) => emitAlpha(Number(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default ColorOpacityInput;
