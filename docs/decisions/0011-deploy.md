# ADR-0011 — Deploy: Cloudflare Pages, Cloud Run e Neon

- Status: Aceita
- Data: 2026-11-27

## Contexto

O Pontoa precisa ir para produção com custo zero (ou
centavos) até o produto ter receita. O cliente usa o sistema
durante a feira, no celular, e não pode esperar a API
"acordar" no meio de uma venda. A API é FastAPI em container
(ADR-0003) e o banco é PostgreSQL 18 (ADR-0004).

O domínio próprio fica para depois: o nome do produto ainda
pode mudar (`pontoa.com.br` já está registrado por terceiros).

## Decisão

- **Frontend:** Cloudflare Pages, ligado ao repositório
  (pasta `frontend`), com prévia automática de cada PR.
- **API:** Google Cloud Run em `southamerica-east1`
  (São Paulo), com no mínimo 0 e no máximo 1 instância e
  cobrança por requisição.
- **Banco:** Neon, região AWS São Paulo (`aws-sa-east-1`),
  PostgreSQL 18, conexão direta (sem pooler).
- **Mesmo endereço:** uma Pages Function encaminha `/api/*`
  para o Cloud Run. O navegador só fala com o site, sem CORS,
  e o cookie HttpOnly (revisão do ADR-0010) fica possível.
- **Deploy:** GitHub Actions após o merge na `main`. O GitHub
  entra no Google por Workload Identity Federation, sem chave
  de conta de serviço guardada em lugar nenhum. As migrações
  rodam num Cloud Run Job com a mesma imagem antes da nova
  versão da API.
- **Segredos:** a URL do banco fica só no Secret Manager do
  Google; o repositório e o GitHub não a guardam.
- **Proteção de custo:** limite de 1 instância no Cloud Run,
  limpeza automática de imagens antigas e alerta de
  orçamento (que só avisa, não bloqueia).
- **Backup:** dump diário além do histórico de 6 horas do
  plano gratuito do Neon (detalhado no PR de deploy).

## Alternativas descartadas

- **Firebase Hosting no lugar do Cloudflare:** encaminha
  `/api` ao Cloud Run sem código, mas descarta todo cookie
  que não se chame `__session` e limita o tráfego grátis a
  360 MB/dia. O Cloudflare tem tráfego estático ilimitado e
  prévia por PR sem configuração.
- **Render (API):** grátis e sem cartão, mas só nos EUA e
  dorme após 15 minutos, com cerca de 1 minuto para voltar.
- **Cloud SQL:** cerca de US$ 12/mês na menor instância em
  São Paulo. Fica para quando houver receita; a troca é só a
  URL de conexão.
- **VM grátis do Google ou da Oracle:** servidor e banco
  administrados por nós; a do Google só existe nos EUA, e a
  da Oracle pode ser recolhida se ficar ociosa.
- **Supabase e banco grátis do Render:** pausa após 7 dias
  de pouca atividade e exclusão após 30 dias,
  respectivamente.
- **Hostinger e HostGator:** a hospedagem compartilhada não
  roda a API em Python; a VPS é paga e administrada por nós.
  Rever junto com o domínio.

## Consequências positivas

- API e banco em São Paulo, perto do cliente
- Custo zero ou centavos no volume de uma barraca
- Nenhuma chave de longa duração para vazar
- Trocar o banco para o Cloud SQL ou mudar o frontend de
  lugar não exige mudança de código

## Consequências negativas

- Exige cartão na conta do Google Cloud
- Três contas (Google Cloud, Cloudflare, Neon) para administrar
- Depois de um tempo sem uso, o primeiro acesso espera
  alguns segundos (Cloud Run e Neon voltando)
- O tráfego de saída em São Paulo não está na cota gratuita
  do Cloud Run; no volume atual, são centavos

## Revisar quando

- O produto tiver receita ou mais de um cliente ativo
- O nome e o domínio forem definidos
- O cookie HttpOnly for implementado (ADR-0010)
