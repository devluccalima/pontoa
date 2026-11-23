"""Senhas e tokens de sessão."""

import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_password_hasher = PasswordHasher()

# Usado quando o e-mail não existe, para que o login leve o mesmo
# tempo e não revele quais e-mails estão cadastrados.
_DUMMY_PASSWORD_HASH = _password_hasher.hash("pontoa-dummy-password")

TOKEN_BYTES = 32


def hash_password(password: str) -> str:
    """Gera o hash Argon2id da senha (com salt aleatório embutido)."""
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    """Confere a senha; sem hash, compara com um hash fictício e retorna False."""
    try:
        verified = _password_hasher.verify(
            password_hash or _DUMMY_PASSWORD_HASH, password
        )
    except VerificationError, InvalidHashError:
        return False
    return verified and password_hash is not None


def password_needs_rehash(password_hash: str) -> bool:
    """Indica se o hash foi gerado com parâmetros antigos."""
    return _password_hasher.check_needs_rehash(password_hash)


def generate_session_token() -> str:
    """Token opaco e aleatório entregue ao cliente."""
    return secrets.token_urlsafe(TOKEN_BYTES)


def hash_session_token(token: str) -> str:
    """Hash SHA-256 do token: o banco nunca guarda o token em si."""
    return hashlib.sha256(token.encode()).hexdigest()
