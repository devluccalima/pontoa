from app.openapi_export import CONTRACT_PATH, build_contract, render_contract


def test_committed_contract_matches_the_code() -> None:
    """Mudou a API? Rode `python -m app.openapi_export` e `npm run gen:api`."""
    committed = CONTRACT_PATH.read_text(encoding="utf-8")

    assert committed == render_contract(build_contract())
