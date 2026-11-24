# ADR-0009 — Pagamentos

- Status: Aceita
- Data: 2026-11-24

## Contexto

O pagamento é registrado manualmente (sem integração
bancária no MVP) e independe da entrega (RN-002, RN-003):
o cliente pode pagar antes ou depois de receber o pedido,
e pedidos entregues sem pagamento continuam a receber
(RN-004).

## Decisão

- Métodos: `pix`, `cash` (dinheiro) e `card` (cartão).
- Registrar o pagamento é a confirmação manual do
  recebimento (RN-005); não há estado "aguardando".
- Um pedido aceita vários pagamentos (ex.: parte no cartão,
  parte em dinheiro), até o total; nunca além dele.
- Em dinheiro, o valor entregue pelo cliente é opcional e
  serve para calcular o troco. O caixa considera apenas o
  valor pago, não o entregue.
- O pagamento entra no caixa aberto no momento do
  recebimento, mesmo que o pedido seja de um turno anterior.
- O pedido guarda `paid_amount` (soma dos pagamentos válidos),
  atualizado na mesma transação do pagamento ou do estorno;
  o banco garante `0 <= paid_amount <= total`. O status
  financeiro (`unpaid`, `partial`, `paid`) é derivado dele.
- Pagamentos não são alterados nem apagados (RN-010): um
  lançamento errado é **estornado** pelo dono, com motivo,
  e apenas enquanto o caixa em que ele entrou estiver aberto.
- Pedido com pagamentos não pode ser cancelado; é preciso
  estornar os pagamentos antes (RN-006).
- Ordem dos bloqueios: caixa, depois pedido. Mantê-la em
  todas as operações evita impasses entre transações.

## Consequências positivas

- O fechamento do caixa considera o dinheiro realmente recebido
- Pagamentos divididos e troco atendem a rotina da barraca
- Caixas fechados não mudam depois da conferência
- Pedidos pendentes de qualquer turno ficam visíveis

## Consequências negativas

- `paid_amount` é uma informação duplicada; toda mudança de
  pagamento precisa passar pelo serviço de pagamentos
- Um erro percebido após o fechamento do caixa não pode ser
  estornado pelo sistema no MVP

## Alternativas consideradas

1. Calcular o pago somando os pagamentos em toda consulta:
   sem duplicação, mas filtros de pendência ficam caros e a
   regra "pago ≤ total" não pode ser garantida pelo banco.
2. Estorno também em caixas fechados: alteraria a conferência
   já feita; exigiria um lançamento de ajuste no caixa atual.
