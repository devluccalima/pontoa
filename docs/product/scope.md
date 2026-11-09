
# Pontoa — Escopo do Produto

**Versão:** MVP 0.1  
**Status:** Planejado  
**Primeiro cenário de validação:** Barraca de arepas

## 1. Visão

O Pontoa é uma plataforma de ponto de venda (PDV)
voltada a pequenos comerciantes, feirantes e
estabelecimentos de alimentação.

O objetivo é substituir pedidos em papel por uma
operação digital, rápida e organizada.

## 2. Público-alvo

- Barracas de comida de rua
- Feirantes
- Quiosques
- Pequenos estabelecimentos comerciais
- Negócios com atendimento presencial

## 3. Objetivos do MVP

- Registrar pedidos e comandas
- Acompanhar o preparo e a entrega
- Registrar recebimentos
- Controlar o caixa
- Visualizar indicadores básicos
- Operar em celular, tablet e computador

## 4. Funcionalidades

### Catálogo
- Cadastrar produtos
- Cadastrar categorias
- Editar preços
- Ativar e desativar produtos

### Pedidos
- Criar pedidos
- Adicionar produtos e quantidades
- Calcular totais
- Identificar por nome ou número
- Acompanhar status
- Cancelar com autorização

### Pagamentos
- Registrar Pix, dinheiro e cartão
- Registrar pagamento antes da entrega
- Registrar pagamento depois da entrega
- Consultar pagamentos pendentes

### Caixa
- Abrir caixa
- Registrar entradas e saídas
- Fechar caixa
- Conferir valores recebidos e diferenças

### Dashboard
- Vendas do período
- Total recebido
- Valores a receber
- Número de pedidos
- Ticket médio
- Produtos mais vendidos

### Administração
- Usuários e permissões
- Configuração do estabelecimento
- Isolamento entre estabelecimentos

## 5. Regras de negócio essenciais

RN-001: Cada pedido pertence a um estabelecimento.

RN-002: Cada pedido possui um status operacional
independente de seu status financeiro.

RN-003: Um pedido pode ser entregue sem estar pago.

RN-004: Pedidos entregues e não pagos permanecem
disponíveis para registro de recebimento.

RN-005: Somente pagamentos confirmados manualmente
são contabilizados como recebimentos.

RN-006: Pedidos cancelados não integram o faturamento
líquido realizado.

RN-007: Os preços dos itens devem ser preservados
no momento da venda.

RN-008: Dados de estabelecimentos diferentes não
podem ser acessados entre si.

RN-009: Usuários devem possuir permissões adequadas
às operações executadas.

RN-010: Movimentações financeiras precisam ser
rastreáveis e não devem ser apagadas diretamente.

## 6. Fora do MVP

- Cardápio digital público
- Delivery
- WhatsApp
- Impressão térmica
- Controle de estoque
- Combos e promoções
- Variações e adicionais
- Operação offline

## 7. Restrições

- Operação inicial com acesso à internet
- Pagamentos registrados manualmente
- Nenhuma integração bancária no MVP
- Primeiro estabelecimento cadastrado internamente
- Dados persistidos desde a primeira versão

## 8. Critério geral de aceite

Uma barraca deve conseguir operar um turno
completo utilizando o Pontoa para registrar pedidos,
acompanhar entregas, receber pagamentos e fechar
o caixa sem depender de comandas em papel.
