import React, { useEffect, useRef, useState } from "react";
import type { ImageWidgetConfig } from "../../../types/widgets";
import { MediaLoadingOverlay } from "./MediaLoadingOverlay";

interface ImageWidgetProps {
  config: ImageWidgetConfig;
}

export const ImageWidget: React.FC<ImageWidgetProps> = ({ config }) => {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset the overlay whenever the source changes. If the image is already
  // decoded in the browser cache, `complete` is true immediately so we skip
  // the loading state — no re-fetch, the cached copy is reused as-is.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setStatus("ready");
    } else {
      setStatus("loading");
    }
  }, [config.imageUrl]);

  if (!config.imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-white/70">
        Image URL not set
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: config.backgroundColor }}>
      <img
        ref={imgRef}
        src={config.imageUrl}
        alt="Widget image"
        className="w-full h-full"
        style={{ objectFit: config.objectFit, display: "block" }}
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
      />
      {status === "error" ? (
        <MediaLoadingOverlay label="Image failed to load" tone="error" />
      ) : (
        status === "loading" && <MediaLoadingOverlay label="Loading image…" />
      )}
    </div>
  );
};

export default ImageWidget;
