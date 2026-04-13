/// <reference types="vite/client" />
/// <reference types="vite/types/importMeta.d.ts" />

interface ImportMetaEnv {
  /** API base URL (browser calls this host when set). Docker/runtime may inject via env replacement. */
  readonly VITE_API_URL?: string;
  /** @deprecated Use VITE_API_URL — kept for container entrypoint scripts that substitute this token in built assets. */
  readonly MERIDIAN_API_URL?: string;
  readonly VITE_APP_TITLE?: string;
  readonly VITE_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
