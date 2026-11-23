#!/bin/sh
# Executado pelo PostgreSQL apenas na criação do volume.
# Cria o banco de testes ao lado do banco principal.
set -eu

createdb --username "$POSTGRES_USER" "${POSTGRES_DB}_test"
