
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

Backend:
- Pendente

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
