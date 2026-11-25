# ADR-0002 — Formato padrão de erros da API

- Status: Aceita
- Data: 2026-11-16

## Contexto

Sem padronização, a API devolvia erros em formatos
diferentes conforme a origem (rota inexistente,
validação, exceção não tratada), e o erro de validação
ecoava os dados enviados pelo cliente.

## Decisão

Todo erro da API usa o envelope:

```json
{"error": {"code": "...", "message": "...", "details": []}}
```

- `code`: identificador estável, usado pelo frontend
- `message`: texto em português para pessoas
- `details`: erros por campo nas validações

Os módulos de negócio lançam exceções de domínio
(`NotFoundError` → 404, `BusinessRuleError` → 409),
traduzidas para HTTP por handlers centrais.

Corpos de requisição recusam campos desconhecidos com 422
(`type: "extra_forbidden"`), pela classe `RequestBody`. Um
nome digitado errado vira erro visível, em vez de ser
ignorado e deixar de gravar o dado. Um teste percorre o
OpenAPI e falha se algum corpo aceitar campos extras.

Registros de outro estabelecimento retornam 404,
nunca 403, para não revelar sua existência.

Erros internos são registrados no log com traceback
e ID da requisição; o cliente recebe só uma mensagem
genérica e o cabeçalho X-Request-ID.

## Justificativa

- Um único formato para o frontend tratar
- Valores enviados pelo cliente nunca retornam na resposta
- Detalhes internos nunca são expostos
- Regras de negócio independentes do FastAPI

## Consequências positivas

- Tratamento de erro previsível no frontend
- Contrato protegido por testes automatizados

## Consequências negativas

- As exceções de domínio carregam o status HTTP
- Mensagens de validação do Pydantic permanecem em inglês;
  o frontend deve usar `field` e `type` para exibição

## Alternativas consideradas

1. RFC 9457 (Problem Details): padrão oficial, porém
   mais verboso e exige URIs de tipo documentadas.
   Reavaliar se a API for aberta a terceiros.
2. Formato padrão do FastAPI: inconsistente entre
   origens e ecoa os dados de entrada.
