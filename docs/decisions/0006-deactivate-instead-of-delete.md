# ADR-0006 — Desativar em vez de apagar

- Status: Aceita
- Data: 2026-11-23

## Contexto

Produtos, categorias e usuários são referenciados por
pedidos, pagamentos e movimentações de caixa. Apagar um
desses registros quebraria o histórico ou exigiria apagar
também o que depende dele, o que contraria a RN-010
(movimentações rastreáveis, sem exclusão direta).

## Decisão

- A API não oferece `DELETE` para estabelecimentos, usuários,
  categorias e produtos. Eles têm o campo `active`, alterado
  por `PATCH`.
- Registros inativos continuam aparecendo nas consultas do
  dono e nos pedidos antigos; a tela de vendas lista só os
  ativos (`?active=true`).
- As chaves estrangeiras usam `ON DELETE RESTRICT`: o banco
  recusa apagar um registro ainda referenciado, mesmo por
  acesso direto ao banco.
- Nomes de categorias e produtos são únicos por
  estabelecimento, sem diferenciar maiúsculas, incluindo os
  inativos: reativar é preferível a cadastrar de novo.
- Valores em dinheiro trafegam no JSON como texto com duas
  casas decimais (`"18.50"`), para não perder precisão em
  clientes que usam ponto flutuante.

## Consequências positivas

- Relatórios e pedidos antigos continuam completos
- Um produto desativado por engano volta com um clique
- Erros de exclusão são barrados também no banco

## Consequências negativas

- Cadastros errados ficam no banco (inativos)
- Um nome usado por um produto inativo não pode ser
  reaproveitado sem renomear o antigo
- O frontend precisa converter o texto do preço em número
  apenas para exibir, nunca para calcular

## Alternativas consideradas

1. Exclusão física com `CASCADE`: apagaria histórico.
2. Exclusão lógica com `deleted_at`: equivale a `active`,
   mas sugere que o registro "não existe mais", enquanto
   aqui ele só deixa de ser oferecido.
