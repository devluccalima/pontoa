/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL da API. Padrão: `/api/v1` no mesmo domínio (proxy do Vite em desenvolvimento). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
