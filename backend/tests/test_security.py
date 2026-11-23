from app.core.security import (
    generate_session_token,
    hash_password,
    hash_session_token,
    verify_password,
)


def test_password_hash_uses_argon2id_with_random_salt() -> None:
    first, second = hash_password("segredo-123"), hash_password("segredo-123")

    assert first.startswith("$argon2id$")
    assert first != second


def test_verify_password() -> None:
    password_hash = hash_password("segredo-123")

    assert verify_password("segredo-123", password_hash)
    assert not verify_password("outra-senha", password_hash)


def test_verify_password_without_hash_is_always_false() -> None:
    assert not verify_password("pontoa-dummy-password", None)
    assert not verify_password("qualquer", None)


def test_verify_password_rejects_malformed_hash() -> None:
    assert not verify_password("segredo-123", "nao-e-um-hash")


def test_session_tokens_are_unique_and_stored_only_as_hash() -> None:
    first, second = generate_session_token(), generate_session_token()

    assert first != second
    assert len(first) >= 43
    assert hash_session_token(first) != first
    assert len(hash_session_token(first)) == 64
