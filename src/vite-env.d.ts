/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_DEMO_PORTALS?: string;
  /** Base URL for the portal API. When unset, the app uses mock data. */
  readonly VITE_API_BASE_URL?: string;
}
