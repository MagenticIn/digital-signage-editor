export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const expandShortHex = (hex: string): string =>
  hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;

export const parseColor = (value: string | undefined | null): RGBA => {
  if (!value) return { r: 0, g: 0, b: 0, a: 1 };
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const full = expandShortHex(`#${hexMatch[1]}`);
    return {
      r: parseInt(full.slice(1, 3), 16),
      g: parseInt(full.slice(3, 5), 16),
      b: parseInt(full.slice(5, 7), 16),
      a: 1,
    };
  }

  const rgbMatch = trimmed.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)$/,
  );
  if (rgbMatch) {
    return {
      r: clamp(Math.round(Number(rgbMatch[1])), 0, 255),
      g: clamp(Math.round(Number(rgbMatch[2])), 0, 255),
      b: clamp(Math.round(Number(rgbMatch[3])), 0, 255),
      a: rgbMatch[4] !== undefined ? clamp(Number(rgbMatch[4]), 0, 1) : 1,
    };
  }

  return { r: 0, g: 0, b: 0, a: 1 };
};

export const formatRgba = ({ r, g, b, a }: RGBA): string => {
  const rr = clamp(Math.round(r), 0, 255);
  const gg = clamp(Math.round(g), 0, 255);
  const bb = clamp(Math.round(b), 0, 255);
  const aa = Math.round(clamp(a, 0, 1) * 100) / 100;
  return `rgba(${rr},${gg},${bb},${aa})`;
};

export const toHex = ({ r, g, b }: RGBA): string => {
  const part = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
};

export const normalizeColor = (value: string | undefined | null): string =>
  formatRgba(parseColor(value));
