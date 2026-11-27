# Deploy: contas e configuração

Passo a passo para criar e configurar as contas do deploy
decidido no [ADR-0011](../decisions/0011-deploy.md):

| Parte | Onde | Cartão |
|---|---|---|
| Banco | Neon, São Paulo | Não |
| API | Google Cloud Run, São Paulo | Sim |
| Site | Cloudflare Pages | Não |

Faça na ordem: Neon → Google Cloud → GitHub → Cloudflare →
primeiro acesso. A parte do Cloudflare e o primeiro acesso
dependem do PR de deploy estar na `main`.

> **Segredos.** A URL do banco contém a senha. Ela vai em
> dois lugares só: no Secret Manager do Google (passo 2.4) e,
> por alguns minutos, no seu terminal (passo 5). Nunca no
> repositório, em issue, em PR ou em chat.

Os nomes abaixo (`pontoa`, `pontoa-prod`) podem ficar mesmo
que o produto mude de nome: só o endereço `*.pages.dev`
aparece para o cliente, e ele é trocado junto com o domínio.

---

## 1. Neon (banco)

### 1.1 Criar a conta

1. Acesse <https://neon.com> e clique em **Sign up**.
2. Entre com a conta do GitHub (mais simples) ou com e-mail.
3. Não precisa de cartão: escolha o plano **Free**.

### 1.2 Criar o projeto

No assistente de criação (ou em **New project**):

| Campo | Valor |
|---|---|
| Project name | `pontoa` |
| Postgres version | **18** |
| Cloud provider | **AWS** |
| Region | **South America (São Paulo)** |

### 1.3 Criar o banco com ordenação em português

O banco padrão do Neon (`neondb`) ordena textos sem regras
do português (por exemplo, "Água" depois de "Zebra"). Crie
um banco igual ao do ambiente local (ADR-0003):

1. No menu do projeto, abra **SQL Editor**.
2. Execute:

   ```sql
   CREATE DATABASE pontoa
     TEMPLATE template0
     ENCODING 'UTF8'
     LOCALE_PROVIDER icu
     ICU_LOCALE 'pt-BR'
     LOCALE 'C.UTF-8';
   ```

Se der erro, guarde a mensagem e siga com o banco criado em
**Databases → New database** (nome `pontoa`); ajustamos a
ordenação depois.

### 1.4 Copiar a URL de conexão

1. No painel do projeto, clique em **Connect**.
2. Em **Database**, escolha `pontoa`.
3. **Desligue** a opção **Connection pooling** (o endereço
   não pode ter `-pooler`).
4. Copie a URL. Ela tem este formato:

   ```text
   postgresql://USUARIO:SENHA@ep-xxxx.sa-east-1.aws.neon.tech/pontoa?sslmode=require&channel_binding=require
   ```

5. Troque o início `postgresql://` por
   `postgresql+psycopg://` (a API exige esse prefixo). Não
   salve a URL em arquivo: ela será colada direto no passo
   2.4 e no passo 5.

---

## 2. Google Cloud (API)

### 2.1 Criar a conta e o faturamento

1. Acesse <https://console.cloud.google.com> com a sua conta
   Google e aceite os termos.
2. Ative o faturamento com o cartão quando pedir. Contas
   novas recebem um crédito de teste de 90 dias; o uso do
   Pontoa deve ficar dentro da cota gratuita mesmo depois.

### 2.2 Criar o projeto

1. No seletor de projetos (topo da tela), clique em
   **Novo projeto**.
2. Nome: `Pontoa`. Em **ID do projeto**, clique em
   **Editar** e use `pontoa-prod`. Se já existir, use
   `pontoa-prod-` com algum sufixo, por exemplo
   `pontoa-prod-lucca`.
3. **Anote o ID**: ele é permanente e é usado nos comandos
   abaixo e no GitHub.
4. Confirme que o projeto está ligado à conta de
   faturamento (**Faturamento → Minhas contas**).

### 2.3 Alerta de orçamento

1. Menu **Faturamento → Orçamentos e alertas → Criar
   orçamento**.
2. Escopo: projeto `Pontoa`.
3. Valor: **R$ 10** por mês.
4. Alertas em **50%, 90% e 100%**, enviados para o seu
   e-mail.

O alerta só avisa; quem limita o gasto é o máximo de 1
instância do Cloud Run, configurado pelo deploy.

### 2.4 Configurar com o Cloud Shell

O Cloud Shell é um terminal no navegador, já autenticado.
Clique no ícone **>_** (Ativar o Cloud Shell) no topo do
console. Cole cada bloco e espere terminar antes do próximo.

**Variáveis** (troque o ID se o seu for diferente):

```bash
PROJECT_ID=pontoa-prod
REGION=southamerica-east1
GITHUB_REPO=devluccalima/pontoa
gcloud config set project "$PROJECT_ID"
```

**APIs do Google usadas pelo deploy** (leva 1 ou 2 minutos):

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com
```

**Repositório de imagens**, guardando só as 5 mais recentes
(a cota grátis é de 0,5 GB):

```bash
gcloud artifacts repositories create pontoa \
  --repository-format=docker \
  --location="$REGION" \
  --description="Imagens da API do Pontoa"

cat > cleanup.json <<'EOF'
[
  {"name": "manter-5-recentes", "action": {"type": "Keep"},
   "mostRecentVersions": {"keepCount": 5}},
  {"name": "apagar-antigas", "action": {"type": "Delete"},
   "condition": {"tagState": "any", "olderThan": "7d"}}
]
EOF
gcloud artifacts repositories set-cleanup-policies pontoa \
  --location="$REGION" --policy=cleanup.json --no-dry-run
rm cleanup.json
```

**URL do banco no Secret Manager.** O comando pede a URL
(com `postgresql+psycopg://`) sem mostrá-la na tela e sem
gravá-la no histórico:

```bash
read -rsp "Cole a URL do Neon e tecle Enter: " DB_URL; echo
printf '%s' "$DB_URL" | gcloud secrets create pontoa-database-url \
  --replication-policy=user-managed \
  --locations="$REGION" \
  --data-file=-
unset DB_URL
```

**Contas de serviço:** uma para a API rodar, outra para o
GitHub publicar.

```bash
gcloud iam service-accounts create pontoa-api \
  --display-name="Pontoa API (execução)"
gcloud iam service-accounts create pontoa-deployer \
  --display-name="Pontoa deploy (GitHub Actions)"

API_SA="pontoa-api@$PROJECT_ID.iam.gserviceaccount.com"
DEPLOY_SA="pontoa-deployer@$PROJECT_ID.iam.gserviceaccount.com"

# A API lê apenas o segredo do banco.
gcloud secrets add-iam-policy-binding pontoa-database-url \
  --member="serviceAccount:$API_SA" \
  --role=roles/secretmanager.secretAccessor

# O deploy publica no Cloud Run, envia imagens e executa a API
# com a conta de serviço dela.
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA" --role=roles/run.admin
gcloud artifacts repositories add-iam-policy-binding pontoa \
  --location="$REGION" \
  --member="serviceAccount:$DEPLOY_SA" --role=roles/artifactregistry.writer
gcloud iam service-accounts add-iam-policy-binding "$API_SA" \
  --member="serviceAccount:$DEPLOY_SA" --role=roles/iam.serviceAccountUser
```

**Acesso do GitHub sem chave** (Workload Identity
Federation). Só a branch `main` deste repositório consegue
publicar; PRs não:

```bash
gcloud iam workload-identity-pools create github \
  --location=global --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github \
  --location=global \
  --workload-identity-pool=github \
  --display-name="GitHub" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository=='$GITHUB_REPO' && assertion.ref=='refs/heads/main'"

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$GITHUB_REPO"
```

**Valores para o GitHub.** Este comando imprime os três
valores do passo 3 (nenhum deles é segredo):

```bash
echo "GCP_PROJECT_ID=$PROJECT_ID"
echo "GCP_WIF_PROVIDER=projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github"
echo "GCP_DEPLOY_SA=$DEPLOY_SA"
```

Se o repositório mudar de nome ou de dono, refaça os dois
últimos comandos de acesso com o nome novo.

---

## 3. GitHub

No repositório, abra **Settings → Secrets and variables →
Actions → aba Variables → New repository variable** e crie:

| Nome | Valor |
|---|---|
| `GCP_PROJECT_ID` | impresso no passo 2.4 |
| `GCP_WIF_PROVIDER` | impresso no passo 2.4 |
| `GCP_DEPLOY_SA` | impresso no passo 2.4 |

São variáveis, não segredos: sozinhas não dão acesso a
nada. Nenhum segredo precisa ser criado no GitHub.

Depois que o PR de deploy entrar na `main`, o workflow
**Deploy** publica a API. Ao terminar, abra o Cloud Run no
console, copie a **URL** do serviço `pontoa-api` (formato
`https://pontoa-api-xxxx.southamerica-east1.run.app`) e
confira `URL/health/ready`: deve responder
`{"status":"ok"}`.

---

## 4. Cloudflare Pages (site)

### 4.1 Criar a conta

1. Acesse <https://dash.cloudflare.com/sign-up>.
2. Cadastre-se com e-mail e confirme o e-mail. Não precisa
   de cartão nem de domínio.

### 4.2 Ligar o repositório

1. No painel, abra **Workers & Pages → Create → Pages →
   Connect to Git**.
2. Autorize o Cloudflare no GitHub, **apenas** no
   repositório `devluccalima/pontoa`.
3. Configure o build:

   | Campo | Valor |
   |---|---|
   | Project name | `pontoa` (vira `pontoa.pages.dev`) |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | `frontend` |

4. Em **Environment variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `NODE_VERSION` | `22` |
   | `API_ORIGIN` | URL do Cloud Run, sem `/` no final |

   Não crie `VITE_API_URL`: o site chama `/api` no próprio
   endereço, e a Pages Function encaminha ao Cloud Run.

5. Clique em **Save and Deploy**.

### 4.3 Conferir

- `https://pontoa.pages.dev` abre a tela de login.
- `https://pontoa.pages.dev/api/v1/auth/me` responde 401 em
  JSON (sinal de que o encaminhamento à API funciona).
- Cada PR ganha um endereço de prévia, mostrado num
  comentário do Cloudflare no PR. As prévias usam a mesma
  API e o mesmo banco de produção: cuidado ao testar nelas.

---

## 5. Primeiro acesso (estabelecimento e dono)

O comando de criação pede a senha no terminal, então roda na
sua máquina, apontando para o banco do Neon. As migrações já
foram aplicadas pelo deploy.

No PowerShell, na pasta `backend`, com o venv ativo:

```powershell
$url = Read-Host "URL do Neon (postgresql+psycopg://...)" -AsSecureString
$env:PONTOA_DATABASE_URL = [System.Net.NetworkCredential]::new('', $url).Password
$env:PONTOA_ENVIRONMENT = "production"

python -m app.cli create-business --name "Arepas da Feira" --owner-name "Lucca" --owner-email SEU_EMAIL

Remove-Item Env:PONTOA_DATABASE_URL, Env:PONTOA_ENVIRONMENT
Remove-Variable url
```

As variáveis valem só para essa janela e têm prioridade
sobre o `backend/.env` local. Depois, entre em
`https://pontoa.pages.dev` com o e-mail e a senha
cadastrados.

---

## Custos e limites para acompanhar

| Serviço | Limite gratuito | Onde ver |
|---|---|---|
| Neon | 1 GB de dados, 100 horas de computação/mês | Painel do projeto → Usage |
| Cloud Run | 2 milhões de requisições/mês; saída em São Paulo é cobrada (centavos) | Faturamento → Relatórios |
| Artifact Registry | 0,5 GB de imagens | Artifact Registry → `pontoa` |
| Cloudflare Pages | 500 builds/mês; 100 mil chamadas/dia à Function | Workers & Pages → `pontoa` → Metrics |
