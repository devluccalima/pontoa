# ADR-0012 — Estoque por produto

- Status: Aceita
- Data: 2026-11-28

## Contexto

Na barraca, a produção do dia é limitada: quando as arepas
acabam, o operador precisa saber na hora, e o sistema não pode
aceitar um pedido que não será entregue. Bebidas e outros
itens comprados prontos também têm quantidade, que passa de um
dia para o outro.

Nem todo produto precisa disso. Um suco feito na hora, por
exemplo, pode ser vendido sem limite.

## Decisão

- **Controle opcional por produto.** O saldo fica em
  `products.stock_quantity`. `NULL` significa sem controle:
  o produto é vendido sem limite, como antes.
- **O dono informa o saldo** (`PUT /products/{id}/stock`), por
  exemplo depois de contar ou produzir, com motivo opcional. A
  primeira vez liga o controle. `DELETE` desliga.
- **O saldo continua** de um dia para o outro; abrir ou fechar
  o caixa não o altera (RN-011).
- **Venda:** o pedido inteiro é recusado (409) se algum
  produto não tiver saldo suficiente, com a quantidade
  disponível de cada um na mensagem. Itens repetidos do mesmo
  produto são somados.
- **Cancelamento devolve** o que o pedido tinha baixado. Se o
  controle foi desligado depois da venda, o produto continua
  sem controle.
- **Histórico:** cada mudança gera um `stock_movements` com
  tipo (ajuste, venda, devolução, controle desligado),
  variação, saldo resultante, pedido, motivo, autor e data.
  Movimentações não são alteradas nem apagadas (RN-010).
- **Concorrência:** a venda bloqueia as linhas dos produtos
  (`SELECT ... FOR UPDATE`, em ordem de id) depois de bloquear
  o caixa; ajuste e cancelamento também bloqueiam o produto.
  Uma venda que espera outra transação lê o saldo já
  atualizado. O banco recusa saldo negativo.
- Apenas o dono altera o saldo e consulta o histórico; todos
  veem o saldo na lista de produtos.

## Consequências positivas

- A barraca não vende o que já acabou
- Quem não quer estoque não muda nada na operação
- O histórico explica qualquer saldo (quem ajustou, qual pedido
  baixou)

## Consequências negativas

- O operador não ajusta o saldo; se o dono não estiver, a
  barraca vende até zerar e depois precisa do dono
- Sem estoque de insumos (farinha, queijo) nem ficha técnica:
  o controle é do produto vendido
- Sem alerta de estoque baixo no backend; o PDV mostra o saldo

## Alternativas consideradas

1. **Saldo zerado a cada caixa** ("estoque do dia"): simples
   para a produção diária, mas obrigaria a informar de novo o
   saldo de bebidas todo turno.
2. **Saldo calculado só pelas movimentações** (soma): sempre
   consistente, mas exige agregação a cada venda e um bloqueio
   que não existe sem uma linha para travar. O saldo na própria
   linha do produto, com o histórico ao lado, é mais simples.
3. **Reserva no carrinho:** evitaria a recusa no final do
   pedido, mas exige expiração de reservas; desnecessário no
   volume de uma barraca.
