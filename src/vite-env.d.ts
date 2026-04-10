/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ENABLE_AUDIT_LOGGING?: string;
  /** When `true`, enables the hidden `/#/qa` report route in production builds (dev always has it). */
  readonly VITE_ENABLE_QA_REPORT?: string;
  readonly VITE_AI_SCORING_MODE?: 'off' | 'live' | 'mock';
  readonly VITE_AI_SERVICE_URL?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_BUILD_DATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
