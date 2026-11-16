
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

Se a ativação falhar por política de execução:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Desenvolvimento

```powershell
python -m uvicorn app.main:create_app --factory --reload
```

- Health check: http://127.0.0.1:8000/health
- Documentação da API: http://127.0.0.1:8000/docs (desativada em produção)

Use sempre `python -m uvicorn` com o ambiente virtual ativo,
para não executar um Uvicorn instalado globalmente.

### Testes e análise estática

```powershell
pytest
ruff check .
ruff format --check .
```

Os testes ignoram o `.env` e as variáveis da máquina.

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

- Ao encerrar o servidor com Ctrl+C no Windows, o Uvicorn
  pode exibir um traceback de `CancelledError` depois de
  "Finished server process". Não afeta a aplicação.
- O Ruff usa `target-version = "py314"` até que o suporte
  ao Python 3.15 seja estável.

Docker:
- Pendente

PostgreSQL:
- Pendente

Migrações:
- Pendente

## Configurações

Credenciais e segredos deverão permanecer
em arquivos .env locais não versionados.

O arquivo .env.example documentará as
variáveis necessárias sem valores sensíveis.
