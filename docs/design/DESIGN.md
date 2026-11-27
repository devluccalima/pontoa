# Pontoa — Design System

## 1. Visão geral

O Pontoa é uma ferramenta de trabalho para atendimento
em feira: poucos toques, botões grandes, leitura rápida
sob sol e pressa.

O conceito é um **balcão bem organizado**: sério e preciso
nos números, caloroso nos detalhes, sem decoração.

Princípios:

1. **Uma ação principal por tela.** Só ela usa o botão
   de destaque.
2. **Números em primeiro lugar.** Valores em dinheiro
   usam algarismos tabulares e alinham à direita.
3. **Hierarquia por superfície e borda, não por sombra.**
   Sombra apenas no que flutua (diálogos, menus,
   barra do carrinho no celular).
4. **Cor tem significado.** Verde é dinheiro recebido,
   âmbar é atenção ou pendência, vermelho é cancelamento
   ou erro. Nenhuma cor é usada só para decorar.
5. **Forma comunica função.** Retângulo arredondado é
   tocável (botões, produtos). Pílula é estado (badges).
6. **Acessível por padrão.** Texto com contraste mínimo
   de 4,5:1, bordas de campos e foco com 3:1.

Referências de tom: a contenção operacional do Uber,
a precisão numérica do Stripe, a hierarquia por camadas
do Linear e o verde comercial do Shopify.

## 2. Cores

O Pontoa tem tema claro e tema escuro. Os componentes usam
apenas tokens de papel; cada tema define os próprios valores.
O tema é aplicado pelo atributo `data-theme` no elemento `html`.

### Marca (fixas nos dois temas)

| Token | Valor | Uso |
|---|---|---|
| `brand` | `#19283C` | Logotipo e barra lateral |
| `accent` | `#E9A23B` | Ação de destaque (com texto `#19283C`) e marca |
| `success` | `#31916C` | Ícones e preenchimentos de sucesso |

### Papéis de interface

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `primary` | `#19283C` | `#F5F7FA` | Fundo do botão principal |
| `on-primary` | `#FFFFFF` | `#19283C` | Texto sobre `primary` |
| `focus` | `#19283C` | `#E9A23B` | Anel de foco do teclado |
| `primary-pressed` | `#0F1A29` | `#DCE2EA` | Botão primário pressionado |
| `accent-pressed` | `#D68F2A` | `#D68F2A` | Botão de destaque pressionado |
| `on-danger` | `#FFFFFF` | `#19283C` | Texto sobre o botão de perigo |
| `neutral-bg` | `#E6E9EE` | `#2A3A50` | Botão desabilitado, badge neutro |

### Superfícies

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `bg` | `#F5F6F8` | `#111B2A` | Fundo da aplicação |
| `surface` | `#FFFFFF` | `#1D2B3E` | Cartões, painéis, comanda |
| `hairline` | `#DDE1E8` | `#34465C` | Divisórias e bordas decorativas |
| `border-strong` | `#7D889A` | `#7A8BA2` | Bordas de campos de formulário |

### Texto

| Token | Claro | Escuro | Contraste (claro / escuro, sobre `surface`) |
|---|---|---|---|
| `text` | `#19283C` | `#F5F7FA` | 14,9:1 / 13,3:1 |
| `muted` | `#5B6779` | `#A8B5C8` | 5,7:1 / 6,9:1 |
| `success-text` | `#246E52` | `#5CC59A` | 6,1:1 / 6,8:1 |
| `accent-text` | `#7A4F0E` | `#E9A23B` | 7,1:1 / 6,6:1 |
| `danger` | `#B42318` | `#F28B82` | 6,6:1 / 6,0:1 |

### Estados (badges)

| Estado | Texto | Fundo | Claro (texto / fundo) | Escuro (texto / fundo) | Contraste |
|---|---|---|---|---|---|
| Pago / Recebido | `success-text` | `success-bg` | `#246E52` / `#E3F2EB` | `#5CC59A` / `#173A2F` | 5,3:1 / 5,9:1 |
| A receber / Atenção | `accent-text` | `accent-bg` | `#7A4F0E` / `#FBEFD9` | `#E9A23B` / `#3A2C14` | 6,3:1 / 6,3:1 |
| Cancelado / Erro | `danger` | `danger-bg` | `#B42318` / `#FCE8E6` | `#F28B82` / `#3F1F22` | 5,6:1 / 6,2:1 |

### Regras

- Componentes nunca usam valores hexadecimais diretamente,
  apenas tokens de papel.
- Sobre `accent`, o texto é sempre `#19283C`, nos dois temas.
  Texto branco sobre âmbar não atinge contraste (2,2:1).
- Tema claro: o âmbar não é usado como texto (2,0:1);
  usar `accent-text`.
- O verde `success` não é usado em texto de tamanho normal;
  usar `success-text`.
- O anel de foco usa `focus`: navy no claro, âmbar no escuro.
- Estados nunca dependem só da cor: todo badge tem texto,
  e ícone quando houver.
- Todo componente é validado nos dois temas antes do merge.

## 3. Tipografia

### Família

| Uso | Família |
|---|---|
| Toda a interface | `"IBM Plex Sans Variable", system-ui, sans-serif` |

- Fonte variável (pesos 100–700), licença OFL-1.1.
- Carregada localmente pelo pacote `@fontsource-variable/ibm-plex-sans`;
  nenhuma requisição a CDN de fontes.
- Os algarismos da IBM Plex Sans são tabulares por padrão.

### Escala

| Token | Tamanho | Peso | Altura de linha | Uso |
|---|---|---|---|---|
| `display` | 28px (1.75rem) | 700 | 1.2 | Total da comanda, valor do caixa |
| `title` | 24px (1.5rem) | 600 | 1.25 | Título da página |
| `heading` | 18px (1.125rem) | 600 | 1.35 | Título de cartão e de seção |
| `price` | 20px (1.25rem) | 600 | 1.2 | Preço no cartão de produto |
| `body` | 16px (1rem) | 400 | 1.5 | Texto geral, itens da comanda |
| `body-strong` | 16px (1rem) | 500 | 1.5 | Nome do produto, rótulos de botão |
| `small` | 14px (0.875rem) | 500 | 1.4 | Badges, textos auxiliares |

### Pesos

Apenas 400, 500, 600 e 700. Pesos finos (abaixo de 400)
não são usados: perdem legibilidade sob luz forte.

### Regras

- Nenhum texto abaixo de 14px.
- Campos de formulário usam no mínimo 16px; abaixo disso,
  o Safari do iPhone aplica zoom automático ao focar.
- Títulos e botões em frase normal ("Finalizar pedido"),
  nunca em caixa-alta.
- Sem espaçamento entre letras (`letter-spacing`) alterado.
- Todo valor numérico (dinheiro, quantidade, código de pedido)
  declara `font-variant-numeric: tabular-nums`. A IBM Plex Sans
  já é tabular, mas a regra protege o alinhamento quando a fonte
  de fallback do sistema estiver em uso.
- Valores monetários são alinhados à direita e formatados com
  `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
  Não montar o texto "R$ " manualmente: o formatador usa espaço
  inquebrável entre símbolo e valor.
- Hierarquia por peso e tamanho, não por cor: texto secundário
  usa `muted`, nunca cores de estado.
- Campo opcional não preenchido aparece como travessão (`—`),
  nunca em branco, para ficar claro que não há valor.

## 4. Espaçamento, formas e layout

### Espaçamento

Grade de 4px. Valores permitidos:

| Token | Valor | Tailwind | Uso típico |
|---|---|---|---|
| `space-1` | 4px | `1` | Ícone e texto colados |
| `space-2` | 8px | `2` | Entre badges, entre itens de lista |
| `space-3` | 12px | `3` | Padding interno de cartão de produto |
| `space-4` | 16px | `4` | Padding de painel, gutter lateral no celular |
| `space-6` | 24px | `6` | Entre blocos de uma página |
| `space-8` | 32px | `8` | Entre seções, gutter no desktop |

Outros valores só com justificativa registrada.

### Raios

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 8px | Campos de formulário, botões pequenos |
| `radius-md` | 12px | Botões, cartões de produto, painéis |
| `radius-pill` | 9999px | Apenas badges de estado |

Elementos aninhados: raio interno = raio externo − padding,
para que as curvas fiquem paralelas.

### Alvos de toque

- Todo elemento tocável tem no mínimo **48 × 48px**.
- Ações principais (finalizar pedido, confirmar pagamento):
  altura de **56px**.
- Distância mínima de **8px** entre alvos vizinhos.
- Botões de quantidade (− / +) seguem o mesmo mínimo,
  mesmo quando o ícone é menor.

### Elevação

| Nível | Classes | Claro | Escuro | Uso |
|---|---|---|---|---|
| 0 — plano | `border border-hairline` | sem sombra | sem sombra | Cartões, painéis, comanda |
| 1 — flutuante | `border border-float-border shadow-float` | sombra `0 8px 24px rgb(25 40 60 / 0.16)`, borda transparente | sem sombra, borda `#7A8BA2` | Diálogos, menus, barra do carrinho |

No tema escuro, sombra quase não é percebida; a separação
vem da borda mais forte.

### Layout

| Faixa | Largura | Estrutura do PDV |
|---|---|---|
| Celular | < 768px | Grade de produtos em 2 colunas; comanda em barra fixa no rodapé que expande ao tocar |
| Tablet | 768–1023px | Barra lateral recolhida; produtos à esquerda, comanda fixa à direita |
| Desktop | ≥ 1024px | Barra lateral completa; produtos e comanda lado a lado |

- Largura mínima suportada: 320px.
- Gutter lateral: 16px no celular, 24px no tablet, 32px no desktop.
- Cartões de produto com largura mínima de 140px; a grade
  ajusta o número de colunas sozinha.
- Elementos fixos no rodapé respeitam a área segura do iPhone
  (`env(safe-area-inset-bottom)`).
- Nenhuma rolagem horizontal da página em nenhuma faixa.

## 5. Componentes

### Botão

| Variante | Fundo | Texto | Uso |
|---|---|---|---|
| Destaque | `accent` | `#19283C` | A ação principal da tela; no máximo uma visível |
| Primário | `primary` | `on-primary` | Confirmações importantes (ex.: em diálogos) |
| Secundário | `surface` + borda `border-strong` | `text` | Voltar, cancelar edição |
| Perigo | `danger` | `on-danger` | Ações destrutivas, sempre com confirmação |

Medidas: altura 48px (56px para a ação principal da tela),
raio `radius-md`, texto `body-strong`, padding lateral 16px.
Ícone opcional à esquerda, 20px, com 8px de distância do texto.

Estados:

| Estado | Comportamento |
|---|---|
| Foco | Anel de 2px na cor `focus`, afastado 2px; apenas com `:focus-visible` |
| Pressionado | Fundo `primary-pressed` / `accent-pressed` e escala 0.98 |
| Desabilitado | Fundo `neutral-bg`, texto `muted`, sem interação |
| Carregando | Mantém a largura; indicador giratório + texto no gerúndio ("Finalizando…"); bloqueia novos toques |

O estado carregando é obrigatório em toda ação que chama a API,
para evitar pedidos ou pagamentos duplicados.

### Cartão de produto

| Estado | Visual |
|---|---|
| Disponível | `surface`, borda `hairline`, nome (`body-strong`) e preço (`price`) |
| Selecionado | Borda de 2px na cor `text` + marcador `accent` com a quantidade |
| Esgotado | Fundo `bg`, borda tracejada, nome em `muted`, texto "Esgotado"; não tocável |

- O cartão inteiro é a área de toque; um toque adiciona uma unidade.
- Altura mínima de 84px; nomes longos quebram em até duas linhas.
- Cartões da mesma fileira têm a mesma altura e o preço fica na base,
  alinhado entre eles.
- A borda de 2px do selecionado não desloca o conteúdo (1px de borda
  + 1px de contorno interno).
- O marcador de quantidade tem no mínimo 28px e borda na cor `bg`.

### Item da comanda

Três colunas: produto (nome + preço unitário em `muted`),
controle de quantidade e subtotal alinhado à direita.

- Botões − e + com 48 × 48px, raio `radius-sm`.
- Com quantidade 1, o botão − vira lixeira na cor `danger`,
  com rótulo acessível "Remover".
- Quantidade e subtotal com algarismos tabulares.

### Badge

| Variante | Texto | Fundo | Ícone |
|---|---|---|---|
| Sucesso | `success-text` | `success-bg` | Check |
| Atenção | `accent-text` | `accent-bg` | Relógio |
| Erro | `danger` | `danger-bg` | X |
| Neutro | `text` | `neutral-bg` | Opcional |

Medidas: texto `small`, raio `radius-pill`, padding 4px × 10px,
ícone de 14px. Badges não são tocáveis.
Estados que não envolvem dinheiro nem problema usam a variante neutra.

### Campo de formulário

- Rótulo sempre visível acima do campo (`small`); placeholder
  nunca substitui o rótulo.
- Altura 48px, raio `radius-sm`, borda 1px `border-strong`,
  texto de 16px no mínimo.
- Valores monetários alinhados à direita, com teclado numérico
  no celular (`inputmode="decimal"`).
- Foco: anel de 2px `focus`, afastado 2px.
- Erro: borda de 2px `danger` e mensagem abaixo, com ícone,
  na cor `danger`, dizendo como corrigir.
- A mensagem de erro é ligada ao campo por `aria-describedby`,
  e o campo recebe `aria-invalid="true"`.

### Ícones

- Biblioteca: Lucide (já instalada no projeto).
- Tamanhos: 20px em botões e navegação, 14px em badges e mensagens.
- Traço de 2px; cor herdada do texto.
- Botão só com ícone exige `aria-label`.

## 6. Movimento e feedback

### Princípios

- Feedback imediato: todo toque responde em até 100ms.
- Movimento só para explicar o que mudou, nunca para enfeitar.
- Nenhuma animação bloqueia a próxima ação da atendente.

### Durações

| Token | Duração | Tailwind | Uso |
|---|---|---|---|
| `motion-fast` | 100ms | `duration-100` | Estado pressionado, troca de cor |
| `motion-base` | 200ms | `duration-200` | Entrada de toast, expansão da comanda, diálogos |

- Curva de saída (`ease-out`) para entradas; nenhuma animação
  acima de 300ms.
- Anima-se apenas `opacity` e `transform`.
- Com `prefers-reduced-motion: reduce`, movimentos são removidos;
  trocas de cor e opacidade instantâneas permanecem.

### Adicionar produto

- O cartão mostra o estado pressionado e o marcador de quantidade
  é atualizado no mesmo instante.
- O total da comanda é atualizado sem animação de contagem:
  o valor correto aparece imediatamente.
- Nenhum toast por produto adicionado.

### Carregamento

- Ações: estado carregando do botão (seção 5).
- Listas e páginas: esqueleto com as formas do conteúdo,
  exibido somente se a espera passar de 300ms, para evitar piscar.

### Confirmações

| Situação | Padrão |
|---|---|
| Remover item da comanda | Executa na hora; toast "Item removido" com ação "Desfazer" por 5s |
| Cancelar pedido, estornar pagamento, fechar caixa | Diálogo de confirmação; botão de perigo com o nome da ação ("Cancelar pedido", nunca "OK") |
| Pedido finalizado, pagamento registrado | Badge de estado atualizado + toast de sucesso por 3s |

Desfazer é preferível a confirmar quando a ação é reversível:
diálogos frequentes viram cliques automáticos.

### Toasts

- Posição: celular, acima da barra da comanda; desktop, canto
  inferior direito.
- Um por vez; um novo substitui o anterior.
- Sucesso e informação: `aria-live="polite"`, somem sozinhos.
- Erro: `role="alert"`, permanece até ser fechado ou corrigido.

### Erros da API

As mensagens seguem o campo `error.code` do envelope (ADR-0002):

| `code` | Exibição |
|---|---|
| `validation_error` | Mensagem em cada campo, a partir de `details[].field` e `details[].type` |
| `business_rule_violation` | Toast de erro com `error.message` vinda da API |
| `not_found` | "Este registro não está mais disponível." e atualização da lista |
| `internal_error` | "Algo deu errado. Tente novamente." + código curto da requisição (8 primeiros caracteres do `X-Request-ID`) |
| Sem conexão | "Sem conexão. Verifique a internet e tente novamente." A comanda em andamento é mantida na tela |

- Nunca exibir mensagens técnicas, códigos HTTP ou textos em inglês.
- Uma falha nunca descarta o que a atendente já montou.

### Tema

- Primeira visita: segue `prefers-color-scheme` do sistema.
- A escolha manual fica salva no navegador e tem prioridade.
- A troca de tema é instantânea, sem transição de cores.
