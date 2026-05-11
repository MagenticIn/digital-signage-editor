import React, { useEffect, useMemo, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PDFConfig } from "../../../types/widgets";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PDFWidgetProps {
  config: PDFConfig;
  currentTime: number;
}

export const PDFWidget: React.FC<PDFWidgetProps> = ({ config, currentTime }) => {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageImage, setPageImage] = useState<string>("");

  useEffect(() => {
    if (!config.file && !config.fileUrl) {
      setPdfDoc(null);
      setPageImage("");
      return;
    }

    let active = true;
    (async () => {
      const bytes = config.file
        ? await config.file.arrayBuffer()
        : await fetch(config.fileUrl!).then((r) => r.arrayBuffer());
      const doc = await pdfjs.getDocument({ data: bytes }).promise;
      if (active) setPdfDoc(doc);
    })().catch((error) => console.error("PDF load failed", error));

    return () => {
      active = false;
    };
  }, [config.file, config.fileUrl]);

  const pageIndex = useMemo(() => {
    const secondsPerPage = Math.max(1, config.secondsPerPage);
    const pages = Math.max(1, config.totalPages || pdfDoc?.numPages || 1);
    const raw = Math.floor(currentTime / secondsPerPage);
    return config.loop ? raw % pages : Math.min(raw, pages - 1);
  }, [config.secondsPerPage, config.totalPages, config.loop, pdfDoc?.numPages, currentTime]);

  useEffect(() => {
    if (!pdfDoc) return;
    let active = true;

    (async () => {
      const page = await pdfDoc.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1.1 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      if (!context) return;
      await page.render({ canvasContext: context, viewport, canvas }).promise;
      if (active) setPageImage(canvas.toDataURL("image/png"));
    })().catch((error) => console.error("PDF page render failed", error));

    return () => {
      active = false;
    };
  }, [pdfDoc, pageIndex]);

  if (!config.file && !config.fileUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-xs text-white/70 bg-black/30 gap-1 px-3 text-center">
        <span className="text-2xl">📄</span>
        <span>PDF widget</span>
        <span className="text-[10px] text-white/50">Upload a file or paste a URL in the inspector</span>
      </div>
    );
  }
  if (!pageImage) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-white/70 bg-black/30">
        Loading PDF…
      </div>
    );
  }

  const totalPages = config.totalPages || pdfDoc?.numPages || 0;
  const imgClass =
    config.fit === "fill"
      ? "w-full h-full object-cover"
      : config.fit === "actual"
        ? "max-w-full max-h-full"
        : "w-full h-full object-contain";
  return (
    <div className="w-full h-full pointer-events-none flex items-center justify-center overflow-hidden relative">
      <img
        key={config.transition === "none" ? undefined : pageIndex}
        src={pageImage}
        alt="PDF page"
        className={`${imgClass} ${
          config.transition === "fade" ? "animate-[pdf-fade_220ms_ease]" : ""
        } ${config.transition === "slide" ? "animate-[pdf-slide_240ms_ease]" : ""}`}
      />
      <style>{`
        @keyframes pdf-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pdf-slide { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
      {config.showPageIndicator && (
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          Page {pageIndex + 1} / {totalPages}
        </div>
      )}
    </div>
  );
};

export default PDFWidget;
