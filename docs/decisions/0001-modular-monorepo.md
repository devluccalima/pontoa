
# ADR-0001 — Monorepo com monólito modular

- Status: Aceita
- Data: 2026-11-09

## Contexto

O Pontoa será inicialmente validado por um
único estabelecimento, mas sua arquitetura
deverá permitir múltiplos negócios.

O desenvolvimento inicial precisa ser simples,
reproduzível e fácil de manter.

## Decisão

Adotar um monorepo com:

- Frontend React + TypeScript
- Backend FastAPI
- PostgreSQL
- Docker Compose

O backend será um monólito modular,
organizado por domínios de negócio.

## Justificativa

- Menor complexidade operacional
- Facilidade de desenvolvimento local
- Versionamento conjunto
- Simplicidade de deploy inicial
- Compartilhamento de documentação
- Evolução gradual dos módulos

## Consequências positivas

- Menos infraestrutura para manter
- Implementação mais rápida do MVP
- Depuração simplificada
- Estrutura reutilizável

## Consequências negativas

- Frontend e backend compartilham repositório
- Necessidade de manter limites entre módulos
- Builds e pipelines precisam considerar
  as duas aplicações

## Alternativas consideradas

1. Repositórios separados para frontend e backend
2. Microsserviços desde o início

Ambas foram descartadas por adicionarem
complexidade desnecessária ao MVP.

## Revisão

A decisão poderá ser revisada se surgirem
necessidades técnicas concretas que justifiquem
outra arquitetura.
