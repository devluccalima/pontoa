
# Configuração do Ambiente

## Sistemas suportados

Ambiente principal de desenvolvimento:
Windows com PowerShell.

## Ferramentas

- Git
- Visual Studio Code
- Node.js
- Python
- Docker Desktop
- PostgreSQL via Docker

## Situação atual

Passo 1:
- Repositório Git inicializado
- Primeiro commit publicado

Passo 2:
- Estrutura e convenções definidas
- Documentação inicial criada

Passo 3:
- Fundação do frontend (React, TypeScript, Vite, Tailwind, rotas)

Passo 4:
- Fundação do backend (FastAPI, configuração, erros, logs, testes)

Passo 5:
- Infraestrutura local com Docker Compose (PostgreSQL e imagem da API)

Passo 6:
- Persistência (SQLAlchemy, Alembic, banco de testes, tabela `businesses`)

Passo 7:
- Autenticação, usuários e papéis (ADR-0005)

## Instalação das aplicações

As instruções serão adicionadas conforme
as próximas etapas forem implementadas.


## Frontend

### Tecnologias

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Vitest
- React Testing Library

### Instalação

Na raiz do repositório:

```powershell
cd frontend
npm ci
```

### Desenvolvimento

```powershell
npm run dev
```

Acesse http://localhost:5173.

### Testes

```powershell
npm run test
```

### Análise estática

```powershell
npm run typecheck
npm run lint
```

### Build

```powershell
npm run build
```

### Arquitetura

O frontend utiliza organização baseada em
funcionalidades (feature-based).

A navegação é gerenciada pelo React Router.

Os estilos utilizam Tailwind CSS e tokens
de identidade visual.

Os módulos de negócio ainda serão integrados
à API FastAPI nas próximas etapas.

## Backend

### Tecnologias

- Python 3.15
- FastAPI e Uvicorn
- pydantic-settings
- SQLAlchemy 2.1, psycopg 3 e Alembic
- Pytest
- Ruff

### Instalação

Todos os comandos do backend devem ser executados
dentro da pasta `backend`, com o ambiente virtual ativo.

```powershell
cd backend
py -3.15 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
```

No `backend/.env`, troque `troque-esta-senha` nas duas URLs
do banco pela `POSTGRES_PASSWORD` do `.env` da raiz.

Se a ativação falhar por política de execução:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Desenvolvimento

```powershell
python -m uvicorn app.main:create_app --factory --reload
```

- Health check: http://127.0.0.1:8000/health
- Prontidão (acesso ao banco): http://127.0.0.1:8000/health/ready
- Documentação da API: http://127.0.0.1:8000/docs (desativada em produção)

Use sempre `python -m uvicorn` com o ambiente virtual ativo,
para não executar um Uvicorn instalado globalmente.

### Testes e análise estática

```powershell
pytest
ruff check .
ruff format --check .
```

Os testes ignoram o `.env` e as variáveis da máquina, exceto
`PONTOA_TEST_DATABASE_URL`, que aponta para o banco de testes.
O banco precisa estar ligado (`docker compose up -d`).

Cada teste de banco roda numa transação desfeita ao final;
o banco de testes é migrado automaticamente no início.
O nome do banco de testes precisa terminar em `_test`.

### Configuração

As variáveis usam o prefixo `PONTOA_` e estão documentadas
em `backend/.env.example`. Prioridade: variável de ambiente,
depois `.env`, depois valor padrão no código.

O `.env` é lido da pasta onde o comando é executado.
Fora de `backend`, ele não é encontrado e os valores
padrão são usados sem aviso.

`PONTOA_DEBUG=true` é proibido quando
`PONTOA_ENVIRONMENT=production`: a aplicação não inicia.

### Observações conhecidas

- O Ruff usa `target-version = "py314"` até que o suporte
  ao Python 3.15 seja estável.
- Ao encerrar o servidor com Ctrl+C (SIGINT), o Uvicorn exibe
  um traceback de `CancelledError` com Python 3.15, em qualquer
  sistema operacional, e a fase de encerramento da aplicação
  não é executada. Com SIGTERM (`docker compose stop`), o
  encerramento é completo e sem erros.

## Docker

### Pré-requisitos

- Docker Desktop com o motor WSL 2

### Configuração

Na raiz do repositório:

```powershell
Copy-Item .env.example .env
```

Defina uma senha em `POSTGRES_PASSWORD`. Para gerar uma:

```powershell
$b = [byte[]]::new(24)
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
-join ($b | ForEach-Object { $_.ToString('x2') })
```

### Banco de dados (dia a dia)

```powershell
docker compose up -d
docker compose ps
```

Sobe apenas o PostgreSQL 18 em `127.0.0.1:5432`.
Aguarde o status `(healthy)`.

Acesso pelo terminal:

```powershell
docker compose exec db psql -U pontoa -d pontoa
```

### API em container (validação da imagem)

Pare o backend local antes; os dois usam a porta 8000.

```powershell
docker compose --profile app up -d --build
docker compose --profile app ps
```

A API roda em modo produção: `/docs` fica desativado.

### Parar e remover

```powershell
docker compose stop                # para, mantém containers e dados
docker compose --profile app down  # remove containers e rede, mantém dados
```

`docker compose down -v` remove também o volume:
**todos os dados do banco são apagados**.

### Observações

- Se a porta 5432 estiver ocupada (outro PostgreSQL),
  defina `POSTGRES_PORT` no `.env`.
- `POSTGRES_INITDB_ARGS` só tem efeito na criação do
  volume. Para aplicar uma mudança, é preciso recriar
  o banco com `down -v`, perdendo os dados.
- O `compose.yaml` fica na raiz; `infra/docker/` está
  reservada para a infraestrutura de produção (ADR-0003).

### Banco de testes

O banco `pontoa_test` é criado automaticamente apenas
quando o volume do PostgreSQL é criado. Em um volume já
existente, crie-o uma vez:

```powershell
docker compose exec db createdb -U pontoa pontoa_test
```

## Primeiro acesso

Com as migrações aplicadas, crie o estabelecimento e o
primeiro dono (a senha é pedida no terminal):

```powershell
python -m app.cli create-business --name "Arepas da Feira" --owner-name "Lucca" --owner-email lucca@example.com
```

Em `/docs`, use `POST /api/v1/auth/login` e copie o
`access_token`; no botão **Authorize**, cole o token para
testar as rotas protegidas.

O dono cadastra os operadores em `POST /api/v1/users`.

Na API em container:

```powershell
docker compose --profile app run --rm api python -m app.cli create-business --name "Arepas da Feira" --owner-name "Lucca" --owner-email lucca@example.com
```

## Migrações

As migrações ficam em `backend/migrations/versions` e são
executadas a partir da pasta `backend`, com o venv ativo.

Aplicar todas as migrações pendentes:

```powershell
alembic upgrade head
```

Criar uma migração depois de alterar um modelo:

```powershell
alembic revision --autogenerate -m "descrição curta"
```

A migração gerada **sempre** deve ser revisada antes do
commit: o autogenerate não detecta tudo (por exemplo,
renomeações viram remoção e criação de coluna).

Outros comandos:

```powershell
alembic current          # versão aplicada no banco
alembic history          # histórico de migrações
alembic downgrade -1     # desfaz a última migração
alembic check            # falha se houver modelo sem migração
```

Todo modelo novo precisa ser importado em
`app/db/models.py`; caso contrário, o autogenerate
não o enxerga.

Na API em container:

```powershell
docker compose --profile app run --rm api alembic upgrade head
```

## Configurações

Credenciais e segredos deverão permanecer
em arquivos .env locais não versionados.

O arquivo .env.example documentará as
variáveis necessárias sem valores sensíveis.
