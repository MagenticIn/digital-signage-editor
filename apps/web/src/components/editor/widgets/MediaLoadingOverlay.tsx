import React from "react";

interface MediaLoadingOverlayProps {
  label: string;
  tone?: "info" | "error";
}

/**
 * Spinner overlay shown over a media widget while its asset loads. Pure visual
 * layer — it never touches the element's `src`, so already-cached media (HTTP
 * cache / IndexedDB blob) loads instantly and the overlay clears immediately.
 */
export const MediaLoadingOverlay: React.FC<MediaLoadingOverlayProps> = ({
  label,
  tone = "info",
}) => (
  <div
    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
    style={{
      background: tone === "error" ? "rgba(40,0,0,0.65)" : "rgba(0,0,0,0.55)",
      color: "rgba(255,255,255,0.92)",
      fontSize: 12,
      letterSpacing: 0.2,
    }}
    aria-live="polite"
  >
    {tone === "info" && (
      <span
        className="inline-block animate-spin"
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.35)",
          borderTopColor: "rgba(255,255,255,0.95)",
          marginRight: 8,
        }}
      />
    )}
    {label}
  </div>
);

export default MediaLoadingOverlay;
