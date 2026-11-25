"""Garante que todo corpo de requisição recusa campos desconhecidos.

Usa o OpenAPI gerado, que é público e estável: `extra="forbid"`
aparece no schema como `additionalProperties: false`.
"""

from fastapi import FastAPI


def test_every_request_body_forbids_unknown_fields(app: FastAPI) -> None:
    spec = app.openapi()
    schemas = spec["components"]["schemas"]
    bodies: dict[str, str] = {}
    for path, operations in spec["paths"].items():
        for method, operation in operations.items():
            content = operation.get("requestBody", {}).get("content", {})
            for media in content.values():
                ref = media["schema"]["$ref"]
                bodies[f"{method.upper()} {path}"] = ref.rsplit("/", 1)[-1]

    assert bodies, "nenhum corpo de requisição encontrado"
    offenders = [
        f"{route}: {name}"
        for route, name in bodies.items()
        if schemas[name].get("additionalProperties") is not False
    ]
    assert offenders == []
