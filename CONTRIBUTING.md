
# Contribuindo com o Pontoa

## Padrões gerais

- Manter o código organizado por domínio
- Não adicionar credenciais ao repositório
- Seguir as convenções descritas em docs/
- Preferir mudanças pequenas
- Documentar decisões arquiteturais relevantes

## Antes de começar

1. Atualize a branch main.
2. Crie uma branch específica.
3. Leia a documentação do módulo envolvido.

## Durante o desenvolvimento

- Evite misturar funcionalidades diferentes
- Adicione testes quando aplicável
- Atualize a documentação quando necessário
- Não modifique contratos sem avaliar impactos

## Commits

Seguimos Conventional Commits.

Exemplos:
- feat(products): add product registration
- fix(orders): correct total calculation
- docs: update development instructions

## Pull Requests

Todo PR deverá informar:

- O que foi alterado
- Por que a alteração é necessária
- Como foi validada
- Possíveis impactos
- Capturas de tela, quando aplicável

## Segurança

Nunca envie arquivos .env, senhas,
tokens ou outras credenciais ao Git.

Problemas de segurança devem ser
tratados antes de publicar correções.
