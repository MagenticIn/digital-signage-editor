import { create } from "zustand";

/**
 * Metadata for the signage layout currently open in the editor (name,
 * description, status, …). Populated from the backend `getSignageLayout`
 * response when the editor is launched with `?signageLayoutId=…`, and shown in
 * the Inspector's Canvas tab so the user knows which layout they're editing.
 *
 * This is purely informational — the editable canvas state lives in the project
 * store; this holds the layout-level fields the editor doesn't otherwise track.
 */
export interface SignageLayoutMeta {
  id: string;
  name: string;
  description: string | null;
  status?: string;
  resolution?: string;
}

interface SignageLayoutState {
  meta: SignageLayoutMeta | null;
  setMeta: (meta: SignageLayoutMeta | null) => void;
}

export const useSignageLayoutStore = create<SignageLayoutState>((set) => ({
  meta: null,
  setMeta: (meta) => set({ meta }),
}));
