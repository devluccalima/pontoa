# ADR-0004 — Persistência com SQLAlchemy e Alembic

- Status: Aceita
- Data: 2026-11-23

## Contexto

O Pontoa precisa persistir dados desde a primeira versão,
com integridade financeira (valores em Decimal), datas
corretas independentemente do fuso do servidor e um
histórico versionado de mudanças no esquema do banco.

## Decisão

- SQLAlchemy 2.1 **síncrono** com o driver psycopg 3.
  Rotas que acessam o banco são `def`, não `async def`.
- URL do banco obrigatória (`PONTOA_DATABASE_URL`), com o
  esquema `postgresql+psycopg://`, tratada como segredo.
- Um engine por aplicação, criado em `create_app`, e uma
  sessão por requisição (dependência `get_db`). A sessão
  não faz commit: quem confirma é a regra de negócio.
- Toda conexão usa o fuso UTC e tem tempo limite de
  conexão de 5 segundos.
- Chaves primárias UUID v7 geradas pela aplicação.
- Dinheiro em `Numeric(10, 2)` / `Decimal`; datas em
  `timestamptz` (UTC). O fuso do estabelecimento fica em
  `businesses.timezone` e define o "dia" do negócio.
- Convenção de nomes para índices e restrições.
- Migrações com Alembic, geradas por autogenerate e
  sempre revisadas manualmente antes do commit.
- Modelos organizados por módulo (`app/modules/<módulo>`),
  registrados em `app/db/models.py`.
- Testes em um banco separado (`pontoa_test`), migrado uma
  vez por sessão; cada teste roda numa transação desfeita
  ao final.
- `/health` indica que o processo está vivo; `/health/ready`
  indica se o banco está acessível (503 quando não está).

## Justificativa

- O volume de um PDV de feira não exige código assíncrono;
  o modelo síncrono é mais simples de escrever e depurar
- UUID v7 é ordenado no tempo (índices eficientes) e não
  expõe a quantidade de registros, como IDs sequenciais
- Decimal evita erros de arredondamento de ponto flutuante
- UTC na conexão torna a representação das datas previsível
  em qualquer servidor
- Nomes de restrições previsíveis tornam as migrações
  revisáveis e reversíveis
- Testes contra PostgreSQL real detectam diferenças que um
  banco em memória esconderia

## Consequências positivas

- A aplicação sobe mesmo com o banco desligado e informa
  o problema pelo `/health/ready`
- Falhas de conexão aparecem em segundos, sem travar a API
- Os testes não deixam dados entre si
- Um teste falha se os modelos divergirem das migrações

## Consequências negativas

- Rotas síncronas ocupam uma thread enquanto aguardam o banco
- Todo modelo novo precisa ser importado em `app/db/models.py`
- O banco de testes só é criado automaticamente na criação
  do volume do PostgreSQL
- A senha do banco aparece em dois `.env` locais (raiz e backend)

## Alternativas consideradas

1. SQLAlchemy assíncrono (asyncpg): mais complexo, sem
   ganho real na escala esperada.
2. IDs inteiros sequenciais: expõem volume e facilitam
   enumeração de registros entre estabelecimentos.
3. UUID v4: aleatório, fragmenta índices.
4. Valores em centavos (inteiros): exige conversão em
   toda a aplicação; Decimal é suportado de ponta a ponta.
5. SQLite nos testes: comportamento diferente do PostgreSQL
   (tipos, fuso, restrições).
