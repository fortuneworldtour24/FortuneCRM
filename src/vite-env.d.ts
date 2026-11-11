/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SERPAPI_API_KEY: string;
  readonly VITE_DEFAULT_CURRENCY: string;
  readonly VITE_DEFAULT_MARKUP_PERCENT: string;
  readonly VITE_FLIGHT_PROVIDER: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
