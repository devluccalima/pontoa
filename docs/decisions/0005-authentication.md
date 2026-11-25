# ADR-0005 — Autenticação por sessões no banco

- Status: Aceita
- Data: 2026-11-23

## Contexto

O Pontoa precisa identificar quem opera o sistema, aplicar
permissões por papel (RN-009) e garantir que um usuário só
acesse os dados do próprio estabelecimento (RN-008).

O dono precisa conseguir tirar o acesso de um operador na
hora, por exemplo quando um funcionário sai da barraca.

## Decisão

- Login por e-mail e senha. O e-mail é único no sistema e
  guardado em minúsculas.
- Senhas com hash Argon2id (`argon2-cffi`), com parâmetros
  padrão da biblioteca e atualização automática do hash no
  login quando os parâmetros mudarem.
- **Sessões opacas no banco**, não JWT: o login gera um token
  aleatório de 256 bits, entregue ao cliente uma única vez;
  o banco guarda apenas o hash SHA-256 dele (`user_sessions`).
- O cliente envia o token em `Authorization: Bearer <token>`.
- Sessões expiram em 12 horas (`PONTOA_SESSION_TTL_HOURS`),
  o equivalente a um turno longo.
- Cada usuário pertence a um único estabelecimento; o
  `business_id` vem sempre do usuário autenticado, nunca
  da requisição.
- Dois papéis no MVP: `owner` (dono) e `operator` (operador).
  Gestão de usuários e do estabelecimento é exclusiva do dono.
- O estabelecimento precisa manter pelo menos um dono ativo.
- Desativar um usuário ou trocar sua senha encerra todas as
  sessões dele. Desativar o estabelecimento bloqueia todos.
- Falhas de login têm resposta idêntica, sem revelar se o
  e-mail existe ou se o acesso foi desativado.
- Registro de outro estabelecimento responde 404, e não 403,
  para não revelar que ele existe.
- O primeiro estabelecimento e seu dono são criados pelo
  comando `python -m app.cli create-business`.

## Justificativa

- Sessões no banco permitem revogação imediata (logout,
  desativação, troca de senha) sem lista de bloqueio
- Uma consulta por requisição é irrelevante nesta escala
- Um token opaco não carrega dados e não depende de chave
  de assinatura, que poderia vazar ou ser mal configurada
- Guardar só o hash impede que um vazamento do banco
  permita entrar como os usuários
- O cabeçalho `Authorization` dispensa proteção contra CSRF,
  necessária com cookies

## Consequências positivas

- Encerrar o acesso de alguém tem efeito na próxima requisição
- Vários aparelhos por usuário, cada um com sua sessão
- O isolamento é testado: listagem, consulta e alteração de
  registros de outro estabelecimento

## Consequências negativas

- O frontend precisa guardar o token; no navegador, ele fica
  acessível a scripts da página (risco de XSS), como em JWT
  guardado no mesmo lugar
  (onde e como: ADR-0010)
- Sem limite de tentativas de login no MVP
- Sem recuperação de senha por e-mail: o dono redefine a
  senha dos operadores
- Sessões expiradas só são apagadas quando o usuário entra
  de novo

## Alternativas consideradas

1. JWT: sem consulta ao banco, mas a revogação imediata
   exigiria uma lista de bloqueio, que anula a vantagem.
2. Cookie de sessão `HttpOnly`: protege o token de scripts,
   mas exige proteção contra CSRF e configuração de cookies
   entre domínios. Pode ser adotado quando frontend e API
   forem publicados no mesmo domínio.
3. PIN por aparelho para troca rápida de operador: mais
   prático na feira, adiado para depois do MVP.
4. Usuário em vários estabelecimentos: adiado; exigiria uma
   tabela de vínculos e a escolha do estabelecimento no login.
