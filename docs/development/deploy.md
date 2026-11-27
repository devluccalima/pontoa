# Deploy: contas e configuração

Passo a passo para criar e configurar as contas do deploy
decidido no [ADR-0011](../decisions/0011-deploy.md). Nenhuma
conta pede cartão.

| Parte | Onde | Região |
|---|---|---|
| Banco | Neon | AWS US East (N. Virginia) |
| API | Render | Virginia (EUA) |
| Site | Cloudflare Pages | Global |
| Ping para a API não dormir | Cloudflare Workers | Global |

Faça na ordem: Neon → Render → primeiro acesso →
Cloudflare. A parte do Cloudflare depende do PR de deploy
estar na `main`.

> **Segredos.** A URL do banco contém a senha. Ela vai em
> dois lugares só: nas variáveis de ambiente do Render (passo
> 2.3) e, por alguns minutos, no seu terminal (passo 3).
> Nunca no repositório, em issue, em PR ou em chat.

Os nomes abaixo (`pontoa`, `pontoa-api`) podem ficar mesmo
que o produto mude de nome: só o endereço `*.pages.dev`
aparece para o cliente, e ele é trocado junto com o domínio.

---

## 1. Neon (banco)

### 1.1 Criar a conta

1. Acesse <https://neon.com> e clique em **Sign up**.
2. Entre com a conta do GitHub (mais simples) ou com e-mail.
3. Escolha o plano **Free**.

### 1.2 Criar o projeto

O banco precisa ficar na mesma região da API (Virginia).
Se você já criou um projeto em São Paulo, apague-o em
**Settings → Delete project** e crie outro:

| Campo | Valor |
|---|---|
| Project name | `pontoa` |
| Postgres version | **18** |
| Cloud provider | **AWS** |
| Region | **US East (N. Virginia)** |

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
   postgresql://USUARIO:SENHA@ep-xxxx.us-east-1.aws.neon.tech/pontoa?sslmode=require&channel_binding=require
   ```

5. Troque o início `postgresql://` por
   `postgresql+psycopg://` (a API exige esse prefixo). Não
   salve a URL em arquivo: ela será colada direto no passo
   2.3 e no passo 3.

---

## 2. Render (API)

### 2.1 Criar a conta

1. Acesse <https://dashboard.render.com/register>.
2. Entre com a conta do GitHub. Não cadastre cartão: sem
   cartão, passar dos limites gratuitos suspende o serviço
   até o mês seguinte em vez de gerar cobrança.

### 2.2 Criar o serviço

1. Clique em **New → Web Service**.
2. Conecte o GitHub e autorize o Render **apenas** no
   repositório `devluccalima/pontoa`.
3. Escolha o repositório e preencha:

   | Campo | Valor |
   |---|---|
   | Name | `pontoa-api` (vira `pontoa-api.onrender.com`) |
   | Language | **Docker** |
   | Branch | `main` |
   | Region | **Virginia (US East)** |
   | Root Directory | `backend` |
   | Dockerfile Path | `./Dockerfile` |
   | Docker Build Context Directory | `.` |
   | Instance Type | **Free** |

   Se o nome `pontoa-api` já estiver em uso no Render, ele
   gera um endereço com sufixo; anote o endereço que
   aparecer, porque ele é usado nos passos 4 e 5.

### 2.3 Variáveis de ambiente

Em **Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `PONTOA_ENVIRONMENT` | `production` |
| `PONTOA_DATABASE_URL` | URL do passo 1.4 (com `postgresql+psycopg://`) |

### 2.4 Opções avançadas

Abra **Advanced** e preencha:

| Campo | Valor |
|---|---|
| Health Check Path | `/health` |
| Docker Command | ver abaixo |
| Auto-Deploy | **After CI Checks Pass** |

**Docker Command** (aplica as migrações e sobe a API; copie
exatamente, com as aspas simples):

```text
sh -c 'alembic upgrade head && exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port $PORT'
```

Use `/health`, e não `/health/ready`, na verificação de
saúde: o `/health/ready` consulta o banco e manteria o Neon
acordado o tempo todo, gastando as horas gratuitas.

### 2.5 Publicar e conferir

1. Clique em **Deploy Web Service**. O primeiro build leva
   alguns minutos.
2. Nos **Logs**, espere aparecer `Running upgrade` (as
   migrações) e depois `Aplicação iniciada (ambiente:
   production)`.
3. Abra `https://pontoa-api.onrender.com/health/ready`. Deve
   responder `{"status":"ok"}`.

Depois disso, cada merge na `main` que mude `backend/` e
passe no CI publica uma versão nova sozinho.

---

## 3. Primeiro acesso (estabelecimento e dono)

O comando de criação pede a senha no terminal, então roda na
sua máquina, apontando para o banco do Neon. As migrações já
foram aplicadas pelo Render no passo 2.5.

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
sobre o `backend/.env` local.

---

## 4. Cloudflare Pages (site)

Depende do PR de deploy estar na `main` (ele traz a função
que encaminha `/api` ao Render).

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
   | `API_ORIGIN` | `https://pontoa-api.onrender.com` (sem `/` no final) |

   Não crie `VITE_API_URL`: o site chama `/api` no próprio
   endereço, e a Pages Function encaminha ao Render.

5. Clique em **Save and Deploy**.

### 4.3 Conferir

- `https://pontoa.pages.dev` abre a tela de login; entre com
  o e-mail e a senha do passo 3.
- `https://pontoa.pages.dev/api/v1/auth/me` responde 401 em
  JSON (sinal de que o encaminhamento à API funciona).
- Cada PR ganha um endereço de prévia, mostrado num
  comentário do Cloudflare no PR. As prévias usam a mesma
  API e o mesmo banco de produção: cuidado ao testar nelas.

---

## 5. Ping para a API não dormir

Sem tráfego por 15 minutos, o Render desliga a API, e o
próximo acesso espera cerca de 1 minuto. Um Worker agendado
chama a API a cada 10 minutos.

1. No Cloudflare, abra **Workers & Pages → Create → Worker
   → Start with Hello World**.
2. Nome: `pontoa-keepalive`. Clique em **Deploy**.
3. Clique em **Edit code**, apague o conteúdo, cole o código
   abaixo e clique em **Deploy**:

   ```js
   // Mantém a API do Render acordada (ADR-0011).
   // /health não consulta o banco, então o Neon continua dormindo.
   export default {
     async scheduled(event, env, ctx) {
       ctx.waitUntil(fetch('https://pontoa-api.onrender.com/health'))
     },
   }
   ```

4. Em **Settings → Trigger Events**, adicione um **Cron
   Trigger** com a expressão `*/10 * * * *`.
5. Depois de meia hora, confira em **Logs** do Worker que as
   execuções terminam com sucesso.

O Worker só funciona com o serviço do Render ligado o mês
inteiro se ele for o **único** serviço gratuito da conta do
Render (744 de 750 horas).

---

## Limites para acompanhar

| Serviço | Limite gratuito | Onde ver |
|---|---|---|
| Neon | 1 GB de dados, 100 horas de computação/mês | Painel do projeto → Usage |
| Render | 750 horas/mês, 5 GB de saída, 500 minutos de build | Workspace → Billing |
| Cloudflare Pages | 500 builds/mês | Workers & Pages → `pontoa` |
| Cloudflare Workers | 100 mil chamadas/dia (Function e ping somados) | Workers & Pages → Metrics |
