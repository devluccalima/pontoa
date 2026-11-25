import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'

/**
 * Política de segurança de conteúdo (ADR-0010): só scripts e estilos do
 * próprio site. Reduz o risco de um script injetado ler o token salvo.
 * Vai só no build: o servidor de desenvolvimento do Vite injeta scripts inline.
 */
function contentSecurityPolicy(apiUrl: string | undefined): Plugin {
  const apiOrigin = apiUrl && /^https?:\/\//.test(apiUrl) ? new URL(apiUrl).origin : ''
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'pontoa-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
    ],
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Em desenvolvimento, /api vai para o backend local: mesmo domínio, sem CORS.
  const apiTarget = env.PONTOA_API_PROXY_TARGET || 'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss(), contentSecurityPolicy(env.VITE_API_URL)],
    server: {
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    preview: {
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
  }
})
