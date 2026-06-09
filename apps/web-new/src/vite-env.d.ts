/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_URL: string;
  readonly VITE_STORAGE_URL: string;
  readonly VITE_RECAPTCHA_SITE_KEY: string;
  readonly VITE_TREINAMENTOS_URL?: string;
  readonly VITE_MAINTENANCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
