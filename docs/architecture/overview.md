
# Arquitetura do Pontoa

## Estilo arquitetural

Monólito modular, organizado em um monorepo.

O sistema será composto por:

1. Frontend React + TypeScript
2. Backend FastAPI
3. Banco PostgreSQL
4. Infraestrutura Docker Compose

## Fluxo de comunicação

Frontend
   |
   | HTTPS / JSON
   v
FastAPI
   |
   | SQLAlchemy
   v
PostgreSQL

O frontend não acessa diretamente o banco.

## Organização do backend

Os módulos representam domínios funcionais:

- auth
- businesses
- users
- categories
- products
- orders
- payments
- cash_register
- dashboard

Cada módulo deverá ter responsabilidades
claras e interfaces bem definidas.

## Organização do frontend

O frontend será organizado por features,
incluindo:

- auth
- pos
- orders
- payments
- cash-register
- dashboard

Componentes visuais genéricos ficarão
separados da lógica específica do negócio.

## Estratégia multinegócio

O Pontoa utilizará um banco compartilhado
com isolamento lógico por estabelecimento.

Entidades vinculadas ao negócio terão
identificação por business_id, direta ou
através de relacionamentos controlados.

O estabelecimento autorizado será determinado
a partir do contexto autenticado.

Toda operação deverá validar o acesso
ao estabelecimento e aos registros envolvidos.

## Segurança

- Autenticação obrigatória para áreas protegidas
- Senhas armazenadas com hash seguro
- Autorização por papel de usuário
- Isolamento entre estabelecimentos
- HTTPS em ambientes publicados
- Segredos fora do repositório
- Registro de eventos importantes

## Integridade financeira

Valores monetários serão tratados com Decimal.

Pedidos e pagamentos terão registros
independentes.

O recebimento poderá ocorrer antes
ou depois da entrega.

Operações financeiras críticas deverão
utilizar transações de banco de dados.

## Evolução

A arquitetura permitirá adicionar funcionalidades
sem tornar obrigatória a separação em
microsserviços.
