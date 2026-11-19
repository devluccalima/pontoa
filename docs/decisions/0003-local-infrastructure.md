# ADR-0003 — Infraestrutura local com Docker Compose

- Status: Aceita
- Data: 2026-11-18

## Contexto

O projeto precisa de um PostgreSQL igual para todos os
ambientes e de uma imagem de produção da API validada
desde o início, sem tornar o desenvolvimento mais lento.

## Decisão

- PostgreSQL 18 (imagem oficial Debian) em container,
  com volume nomeado e ordenação ICU `pt-BR`.
- No desenvolvimento, backend e frontend rodam na máquina
  (venv e Vite); apenas o banco roda em container.
- A API tem uma imagem de produção (`backend/Dockerfile`),
  executada pelo Compose no perfil `app` para validação.
- `compose.yaml` na raiz do repositório; `infra/docker/`
  fica reservada para infraestrutura de produção.
- Portas publicadas apenas em `127.0.0.1`.
- Credenciais no `.env` da raiz, não versionado;
  variáveis obrigatórias falham na inicialização.

## Justificativa

- Banco reproduzível sem instalação no Windows
- Reload rápido e debugger no desenvolvimento
- Problemas da imagem de produção aparecem cedo
- Ordenação correta de textos em português, estável
  entre atualizações do sistema operacional
- Comandos curtos (`docker compose up`) a partir da raiz

## Consequências positivas

- Um comando sobe o banco; outro sobe banco e API
- Dados preservados entre recriações de containers
- API em container sem privilégios de root

## Consequências negativas

- A API em container e a API local disputam a porta 8000
- Os argumentos de inicialização do banco valem apenas
  na criação do volume
- Sem lockfile, o build reinstala dependências a cada
  mudança de código

## Alternativas consideradas

1. PostgreSQL 19: lançamento previsto para 19/11/2026;
   adiado para depois do MVP, por ser uma versão `.0`.
2. Imagem Alpine: menor, mas usa musl, com diferenças
   de ordenação de texto.
3. Backend e frontend em containers no desenvolvimento:
   recarregamento lento no Windows e debugger mais complexo.
4. `compose.yaml` em `infra/docker/`: exigiria `-f` em
   todos os comandos.
