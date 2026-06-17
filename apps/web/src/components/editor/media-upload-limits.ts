/**
 * Per-type upload size limits for the editor's media library, mirroring the
 * signage dashboard (digital-signage-fe). A file is accepted if its extension
 * OR MIME type matches a category and its size is within that category's cap.
 *
 * `audio` is editor-specific (the dashboard doesn't allow audio uploads) — kept
 * here so the editor's audio widgets can still source uploaded audio.
 */
const BYTES_PER_MB = 1024 * 1024;

export type UploadCategoryKey = "image" | "document" | "video" | "audio";

export interface UploadCategoryDef {
  label: string;
  maxBytes: number;
  mimeTypes: string[];
  extensions: string[];
}

export const ACCEPTED_UPLOAD_TYPES: Record<UploadCategoryKey, UploadCategoryDef> = {
  image: {
    label: "Image",
    maxBytes: 5 * BYTES_PER_MB,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    extensions: ["jpg", "jpeg", "png", "webp"],
  },
  document: {
    label: "Document",
    maxBytes: 25 * BYTES_PER_MB,
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    extensions: ["pdf", "doc", "docx", "ppt", "pptx"],
  },
  video: {
    label: "Video",
    maxBytes: 512 * BYTES_PER_MB,
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    extensions: ["mp4", "webm", "mov"],
  },
  audio: {
    label: "Audio",
    maxBytes: 512 * BYTES_PER_MB,
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/aac"],
    extensions: ["mp3", "wav", "ogg", "m4a", "aac"],
  },
};

/** `accept` attribute for the upload file input, derived from the allow-list. */
export const UPLOAD_ACCEPT_ATTR = (
  Object.values(ACCEPTED_UPLOAD_TYPES) as UploadCategoryDef[]
)
  .flatMap((def) => [...def.extensions.map((ext) => `.${ext}`), ...def.mimeTypes])
  .join(",");

/** Human summary of accepted types + caps, derived so it never drifts. */
export const UPLOAD_SIZE_SUMMARY =
  (Object.values(ACCEPTED_UPLOAD_TYPES) as UploadCategoryDef[])
    .map(
      (def) =>
        `${def.label.toLowerCase()}s (${def.extensions.join(", ")}) up to ${
          def.maxBytes / BYTES_PER_MB
        } MB`,
    )
    .join(" · ")
    .replace(/^./, (c) => c.toUpperCase()) + ".";

const fileExtension = (name: string): string => {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
};

export type UploadValidationResult = { ok: true } | { ok: false; message: string };

/** Validate a selected file against the per-type allow-list + size caps. */
export function validateUploadFile(file: File): UploadValidationResult {
  const ext = fileExtension(file.name);
  const mime = (file.type || "").toLowerCase();
  const key = (Object.keys(ACCEPTED_UPLOAD_TYPES) as UploadCategoryKey[]).find(
    (k) =>
      ACCEPTED_UPLOAD_TYPES[k].extensions.includes(ext) ||
      ACCEPTED_UPLOAD_TYPES[k].mimeTypes.includes(mime),
  );
  if (!key) {
    return { ok: false, message: `Unsupported file type. ${UPLOAD_SIZE_SUMMARY}` };
  }
  const def = ACCEPTED_UPLOAD_TYPES[key];
  if (file.size > def.maxBytes) {
    const cap = def.maxBytes / BYTES_PER_MB;
    const actual = (file.size / BYTES_PER_MB).toFixed(1);
    return {
      ok: false,
      message: `${def.label} files must be ${cap} MB or smaller. "${file.name}" is ${actual} MB.`,
    };
  }
  return { ok: true };
}
