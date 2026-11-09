
# Fluxo de Desenvolvimento

## Estratégia Git

O projeto utiliza branches curtas,
criadas a partir da main.

A branch main representa a versão
estável e integrada do projeto.

## Processo padrão

1. Atualizar a main
2. Criar branch de trabalho
3. Implementar alterações
4. Executar validações
5. Criar commits descritivos
6. Enviar branch ao GitHub
7. Abrir Pull Request
8. Revisar as alterações
9. Integrar à main
10. Excluir a branch concluída

## Nomenclatura

- feat/*
- fix/*
- docs/*
- refactor/*
- chore/*

## Commits

Utilizar Conventional Commits.

Exemplos:

feat(orders): add order creation
fix(payments): correct paid amount
docs(api): document authentication
test(orders): add order validation tests

## Revisão

Antes do merge:

- Alterações coerentes com o escopo
- Sem credenciais versionadas
- Código formatado
- Testes aplicáveis aprovados
- Documentação atualizada
- Sem alterações não relacionadas

## Merge

Preferir Squash and merge para manter
o histórico da main organizado.

## Proteção da main

Evitar commits diretos na main.

Configurar regras de proteção quando
o plano e o repositório permitirem.

## Definição de pronto

Uma alteração está concluída quando
foi validada, documentada quando
necessário e integrada à main.
