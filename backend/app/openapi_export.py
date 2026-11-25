"""Exporta o contrato OpenAPI da API para um arquivo versionado.

O frontend gera os tipos TypeScript a partir desse arquivo
(`npm run gen:api`), e um teste do backend falha se ele
ficar desatualizado em relação ao código.

Uso (na pasta backend, com o venv ativo):

    python -m app.openapi_export
"""

import json
import sys
from pathlib import Path
from typing import Any

from app.core.config import Settings
from app.main import create_app

CONTRACT_PATH = Path(__file__).resolve().parents[2] / "docs" / "api" / "openapi.json"

# Gerar o contrato não conecta ao banco; a URL só satisfaz a validação.
_PLACEHOLDER_DATABASE_URL = "postgresql+psycopg://openapi@localhost/openapi"


def build_contract() -> dict[str, Any]:
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=_PLACEHOLDER_DATABASE_URL,
    )
    return create_app(settings).openapi()


def render_contract(contract: dict[str, Any]) -> str:
    return json.dumps(contract, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main() -> None:
    CONTRACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONTRACT_PATH.write_text(render_contract(build_contract()), encoding="utf-8")
    print(f"Contrato gravado em {CONTRACT_PATH}", file=sys.stderr)


if __name__ == "__main__":
    main()
