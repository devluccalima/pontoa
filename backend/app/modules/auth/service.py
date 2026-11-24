from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.security import (
    generate_session_token,
    hash_password,
    hash_session_token,
    password_needs_rehash,
    verify_password,
)
from app.modules.auth.models import UserSession
from app.modules.businesses.models import Business
from app.modules.users.models import User


def authenticate(db: Session, email: str, password: str) -> User | None:
    """Retorna o usuário se o e-mail e a senha conferem e o acesso está ativo.

    Todos os motivos de recusa retornam None, para não revelar se o
    e-mail existe, se a senha está errada ou se o acesso foi desativado.
    """
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if not verify_password(password, user.password_hash if user else None):
        return None
    if user is None or not user.active or not user.business.active:
        return None

    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    return user


def create_session(db: Session, user: User, ttl: timedelta) -> tuple[str, datetime]:
    """Abre uma sessão e retorna o token (mostrado uma única vez) e a expiração."""
    db.execute(
        delete(UserSession).where(
            UserSession.user_id == user.id,
            UserSession.expires_at <= func.now(),
        )
    )
    token = generate_session_token()
    expires_at = datetime.now(UTC) + ttl
    db.add(
        UserSession(
            user_id=user.id,
            token_hash=hash_session_token(token),
            expires_at=expires_at,
        )
    )
    db.commit()
    return token, expires_at


def get_session_user(db: Session, token: str) -> User | None:
    """Usuário dono de uma sessão válida, ou None."""
    statement = (
        select(User)
        .join(UserSession, UserSession.user_id == User.id)
        .join(Business, Business.id == User.business_id)
        .where(
            UserSession.token_hash == hash_session_token(token),
            UserSession.expires_at > func.now(),
            User.active.is_(True),
            Business.active.is_(True),
        )
    )
    return db.scalar(statement)


def revoke_session(db: Session, token: str) -> None:
    db.execute(
        delete(UserSession).where(UserSession.token_hash == hash_session_token(token))
    )
    db.commit()
