# ADR-0010 — Sessão no frontend

- Status: Aceita (provisória; o deploy do ADR-0011 permite trocar por cookie HttpOnly)
- Data: 2026-11-25

## Contexto

O login devolve um token opaco válido por 12 horas
(ADR-0005), enviado em `Authorization: Bearer`. O frontend
precisa guardá-lo em algum lugar.

Na feira, o requisito mais forte é não deslogar no meio do
movimento: recarregar a página, trocar de aplicativo ou o
navegador do celular descartar a aba não podem pedir senha
de novo. O deploy ainda não foi escolhido, e a meta é custo
zero até o produto ter retorno.

## Decisão

- O token fica no `localStorage`, acessado só por
  `src/auth/tokenStore.ts`. Trocar o armazenamento muda
  apenas esse arquivo.
- Se o `localStorage` estiver bloqueado, o token fica na
  memória da aba.
- Um 401 em requisição autenticada apaga o token e volta ao
  login com o aviso "Sua sessão expirou".
- Se a API não responder ao reabrir o app, o token é
  mantido e a tela oferece "Tentar de novo", em vez de
  deslogar por falta de internet.
- O build publica uma política de segurança de conteúdo
  (CSP) que só aceita scripts e estilos do próprio site.
- Em desenvolvimento, o Vite encaminha `/api` ao backend:
  frontend e API respondem no mesmo endereço.

## Consequências positivas

- O login sobrevive a recarregar e a fechar o navegador
  durante as 12 horas do turno
- Nenhuma mudança no backend e nenhuma restrição de domínio
  para o deploy
- A migração para cookie fica concentrada num arquivo

## Consequências negativas

- Um script injetado na página (XSS) conseguiria ler o
  token. Mitigações: React escapa o texto exibido, não há
  HTML vindo do usuário nem scripts de terceiros, e a CSP
  bloqueia scripts de outras origens
- Quem pegar o aparelho logado usa a sessão; vale para
  qualquer armazenamento. Mitigação: "Sair" revoga a sessão
  no banco e o dono pode desativar o usuário
- A CSP via `<meta>` não cobre `frame-ancestors`; isso
  precisa de cabeçalho HTTP no deploy

## Alternativas consideradas

1. Só na memória: perde o login a cada recarregamento; no
   celular, o navegador descarta abas em segundo plano.
2. `sessionStorage`: mesmo risco de XSS do `localStorage` e
   perde o login ao fechar a aba.
3. Cookie `HttpOnly`: o script da página não lê o token.
   Exige proteção contra CSRF, mudanças no backend e
   frontend e API no mesmo domínio. É o caminho preferido
   quando o deploy for definido com domínio único.
