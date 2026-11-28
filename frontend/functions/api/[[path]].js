/**
 * Pages Function (ADR-0011): encaminha `/api/*` para a API no Render.
 *
 * Para o navegador, site e API ficam no mesmo endereço, sem CORS.
 * `API_ORIGIN` é a URL do serviço no Render, definida nas variáveis de
 * ambiente do projeto no Cloudflare Pages (sem `/` no final).
 * As demais rotas não passam por aqui: o Pages serve os arquivos de `dist/`.
 */
export async function onRequest({ request, env }) {
  if (!env.API_ORIGIN) {
    return Response.json(
      { error: { code: 'misconfigured', message: 'API_ORIGIN não configurada no Cloudflare Pages.', details: [] } },
      { status: 500 },
    )
  }
  const url = new URL(request.url)
  const target = new URL(url.pathname + url.search, env.API_ORIGIN)
  return fetch(new Request(target, request))
}
