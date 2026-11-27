# ADR-0011 — Deploy: Cloudflare Pages, Render e Neon

- Status: Aceita
- Data: 2026-11-27

## Contexto

O Pontoa precisa ir para produção com custo zero até o
produto ter receita, sem cartão e sem dinheiro empatado. O
cliente usa o sistema durante a feira, no celular, e não pode
esperar a API "acordar" no meio de uma venda. A API é FastAPI
em container (ADR-0003) e o banco é PostgreSQL 18 (ADR-0004).

O domínio próprio fica para depois: o nome do produto ainda
pode mudar (`pontoa.com.br` já está registrado por terceiros).

## Decisão

- **Frontend:** Cloudflare Pages, ligado ao repositório
  (pasta `frontend`), com prévia automática de cada PR.
- **API:** Render, serviço web gratuito com o `Dockerfile`
  do backend, na região Virginia (EUA). Publica sozinho
  quando o CI da `main` passa.
- **Banco:** Neon, plano gratuito, região AWS US East
  (N. Virginia), PostgreSQL 18, conexão direta (sem pooler).
  Fica na mesma região da API: cada consulta atravessaria o
  continente se o banco ficasse em São Paulo.
- **Mesmo endereço:** uma Pages Function encaminha `/api/*`
  para o Render. O navegador só fala com o site, sem CORS, e
  o cookie HttpOnly (revisão do ADR-0010) fica possível.
- **Migrações:** o plano gratuito do Render não tem comando
  de pré-deploy nem shell. O script de início da imagem
  (`backend/start.sh`) roda `alembic upgrade head` antes do
  `uvicorn` quando `PONTOA_MIGRATE_ON_START=true`. Com uma
  instância só, não há duas migrações ao mesmo tempo.
- **API acordada:** o Render desliga o serviço gratuito após
  15 minutos sem tráfego, e voltar leva cerca de 1 minuto.
  Um Worker do Cloudflare com agendamento chama `/health` a
  cada 10 minutos. Um mês tem no máximo 744 horas, dentro
  das 750 gratuitas, desde que seja o único serviço gratuito
  da conta.
- **Banco dormindo quando ninguém usa:** o ping e a
  verificação de saúde do Render usam `/health`, que não
  consulta o banco. O Neon só acorda com uso real, e as 100
  horas de computação por mês atendem os turnos.
- **Segredos:** a URL do banco fica só nas variáveis de
  ambiente do Render.
- **Backup:** dump diário além do histórico de 6 horas do
  plano gratuito do Neon (detalhado no PR de deploy).

## Alternativas descartadas

- **Cloud Run (Google):** API em São Paulo e sem espera para
  acordar, mas o faturamento do Google exigiu um
  pré-pagamento de R$ 170 (reembolsável só ao encerrar a
  conta). É a primeira opção a rever quando houver receita.
- **Firebase Hosting no lugar do Cloudflare:** descarta todo
  cookie que não se chame `__session`, limita o tráfego
  grátis a 360 MB/dia e também exige faturamento do Google.
- **Cloud SQL:** cerca de US$ 12/mês na menor instância.
- **VM grátis do Google ou da Oracle:** servidor e banco
  administrados por nós, com cartão; a da Oracle pode ser
  recolhida se ficar ociosa.
- **Supabase e banco grátis do Render:** pausa após 7 dias
  de pouca atividade e exclusão após 30 dias,
  respectivamente.
- **Koyeb e Fly.io:** sem plano gratuito para contas novas.
- **Hostinger e HostGator:** a hospedagem compartilhada não
  roda a API em Python; a VPS é paga e administrada por nós.
  Rever junto com o domínio.

## Consequências positivas

- Custo zero, sem cartão em nenhuma conta
- A API usa o mesmo `Dockerfile` validado no CI
- Trocar a API de lugar (Cloud Run, VPS) ou o banco (Cloud
  SQL) não exige mudança de código, só configuração

## Consequências negativas

- API e banco nos EUA: cada chamada do celular leva cerca de
  0,1 a 0,2 s a mais do que levaria em São Paulo
- Se o ping falhar, o primeiro acesso depois de 15 minutos
  parado espera cerca de 1 minuto
- O Render diz que o plano gratuito não é para produção e
  pode reiniciar o serviço a qualquer momento
- Ao passar de 750 horas, 5 GB de tráfego de saída ou 500
  minutos de build no mês, o Render suspende o serviço (sem
  cartão, não há cobrança) até o mês seguinte
- A configuração do serviço no Render (região, variáveis,
  verificação de saúde) fica fora do repositório; o guia de
  deploy é a referência

## Revisar quando

- O produto tiver receita ou mais de um cliente ativo
- O nome e o domínio forem definidos
- O cookie HttpOnly for implementado (ADR-0010)
