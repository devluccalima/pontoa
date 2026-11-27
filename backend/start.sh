#!/bin/sh
# Inicia a API dentro do container.
#
# PORT: porta HTTP (padrão 8000; o Render define a sua).
# PONTOA_MIGRATE_ON_START=true: aplica as migrações antes de subir.
# Usado no Render, que não tem comando de pré-deploy no plano
# gratuito (ADR-0011). Seguro só com uma instância por vez.
set -eu

if [ "${PONTOA_MIGRATE_ON_START:-false}" = "true" ]; then
    alembic upgrade head
fi

exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port "${PORT:-8000}"
