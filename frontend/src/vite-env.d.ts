/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend root URL (see `src/api-production/api.js`) */
  readonly VITE_API_URL?: string;
  /** @deprecated Prefer `VITE_API_URL`; still read by api.js as fallback */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
