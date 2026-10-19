/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAP_PROVIDER?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
