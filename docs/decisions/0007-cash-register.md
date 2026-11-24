# ADR-0007 — Caixa por turno

- Status: Aceita
- Data: 2026-11-24

## Contexto

O critério de aceite do MVP é operar um turno completo e
fechar o caixa sem comandas em papel. O fechamento precisa
comparar o dinheiro contado com o que deveria estar na gaveta.

## Decisão

- O caixa é um turno (`cash_sessions`): abre com um valor
  inicial (troco) e fecha com o valor contado.
- **Um caixa aberto por estabelecimento**, garantido por um
  índice único parcial (`WHERE closed_at IS NULL`).
- Pedidos e pagamentos exigem caixa aberto e pertencem ao
  turno em que foram registrados. Os pedidos são numerados
  a partir de 1 em cada turno (`next_order_number`).
- Suprimentos e sangrias (`cash_movements`) são imutáveis:
  não há alteração nem exclusão (RN-010). Um lançamento
  errado é corrigido com outro lançamento oposto.
- A sangria não pode superar o dinheiro esperado no caixa.
- Valor esperado = abertura + suprimentos − sangrias +
  recebimentos em dinheiro do turno. No fechamento, o valor
  esperado é gravado, e a diferença (contado − esperado)
  indica sobra ou falta.
- Abrir, movimentar, fechar e consultar o histórico são
  ações do dono. Todos os usuários veem se há caixa aberto.
- Operações que dependem do saldo ou da numeração bloqueiam
  a linha do caixa (`SELECT ... FOR UPDATE`) até o fim da
  transação, para que requisições simultâneas esperem a vez.

## Consequências positivas

- O fechamento é exato: cada centavo pertence a um turno
- Números de pedido curtos, fáceis de chamar em voz alta
- Duas aberturas simultâneas não criam dois caixas

## Consequências negativas

- Sem caixa aberto, não é possível vender
- O operador depende do dono para abrir e fechar o caixa
- Pedidos de turnos diferentes podem ter o mesmo número;
  a identificação única continua sendo o `id`

## Alternativas consideradas

1. Numeração diária: depende do fuso e não acompanha
   turnos que passam da meia-noite.
2. Numeração contínua: números grandes para chamar.
3. Caixa opcional: conferência imprecisa.
