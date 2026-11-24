# ADR-0008 — Pedidos

- Status: Aceita
- Data: 2026-11-24

## Contexto

O pedido substitui a comanda de papel: precisa identificar o
cliente, acompanhar o preparo e preservar o que foi vendido,
mesmo que o catálogo mude depois (RN-007).

## Decisão

- O pedido pertence ao caixa aberto e recebe o próximo número
  do turno (ADR-0007), com nome do cliente opcional.
- Cada item copia o **nome e o preço** do produto no momento
  da venda; o total do pedido é calculado pelo backend.
  O banco confere `line_total = unit_price * quantity`.
- Observação livre por item (ex.: "sem cebola"); variações
  e adicionais estruturados ficam fora do MVP.
- Fluxo operacional: `new` → `preparing` → `ready` →
  `delivered`. O pedido só avança e pode pular etapas
  (venda no balcão vai direto para entregue).
- O status operacional é independente do financeiro
  (RN-002): o pagamento é registrado à parte.
- Cancelamento exige motivo e registra quem cancelou e quando.
  O operador cancela pedidos `new`; depois que o preparo
  começa, apenas o dono.
- Pedidos não são editados nem apagados: um pedido errado é
  cancelado e registrado de novo.
- O caixa não fecha com pedidos em andamento (`new`,
  `preparing` ou `ready`).
- Alterações de status e cancelamento bloqueiam a linha do
  pedido, evitando que um cancelamento e uma entrega
  simultâneos deixem o pedido inconsistente.

## Consequências positivas

- Relatórios refletem o preço realmente cobrado
- Cancelamentos são rastreáveis
- Uma tela de preparo pode listar `?status=new&status=preparing`

## Consequências negativas

- Corrigir um item exige cancelar e registrar de novo
- Dois pedidos com o mesmo produto guardam o nome repetido

## Alternativas consideradas

1. Editar itens enquanto o pedido é `new`: mais prático,
   adiado para depois do MVP para manter o histórico simples.
2. Calcular o total a partir do produto atual: violaria a RN-007.
