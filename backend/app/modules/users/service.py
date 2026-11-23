import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.core.security import hash_password
from app.modules.auth.models import UserSession
from app.modules.users.models import User, UserRole
from app.modules.users.schemas import UserCreate, UserUpdate


def list_users(db: Session, business_id: uuid.UUID) -> list[User]:
    statement = select(User).where(User.business_id == business_id).order_by(User.name)
    return list(db.scalars(statement))


def get_user(db: Session, business_id: uuid.UUID, user_id: uuid.UUID) -> User:
    """Busca um usuário do estabelecimento; de outro estabelecimento é 404."""
    user = db.scalar(
        select(User).where(User.id == user_id, User.business_id == business_id)
    )
    if user is None:
        raise NotFoundError("Usuário não encontrado.")
    return user


def email_in_use(db: Session, email: str) -> bool:
    return db.scalar(select(User.id).where(User.email == email)) is not None


def create_user(db: Session, business_id: uuid.UUID, data: UserCreate) -> User:
    if email_in_use(db, data.email):
        raise BusinessRuleError("Já existe um usuário com este e-mail.")

    user = User(
        business_id=business_id,
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        # Dois cadastros simultâneos com o mesmo e-mail: o banco decide.
        db.rollback()
        raise BusinessRuleError("Já existe um usuário com este e-mail.") from exc
    return user


def update_user(db: Session, user: User, data: UserUpdate) -> User:
    changes = data.changes()

    loses_owner_access = (
        user.role == UserRole.OWNER
        and user.active
        and (
            changes.get("role", UserRole.OWNER) != UserRole.OWNER
            or changes.get("active", True) is False
        )
    )
    if loses_owner_access and _count_active_owners(db, user.business_id) <= 1:
        raise BusinessRuleError(
            "O estabelecimento precisa de pelo menos um dono ativo."
        )

    if "name" in changes:
        user.name = changes["name"]
    if "role" in changes:
        user.role = changes["role"]
    if "active" in changes:
        user.active = changes["active"]
    if "password" in changes:
        user.password_hash = hash_password(changes["password"])

    # Desativar ou trocar a senha encerra as sessões abertas na hora.
    if changes.get("active") is False or "password" in changes:
        revoke_all_sessions(db, user.id)

    db.commit()
    return user


def revoke_all_sessions(db: Session, user_id: uuid.UUID) -> None:
    db.execute(delete(UserSession).where(UserSession.user_id == user_id))


def _count_active_owners(db: Session, business_id: uuid.UUID) -> int:
    statement = select(func.count(User.id)).where(
        User.business_id == business_id,
        User.role == UserRole.OWNER,
        User.active.is_(True),
    )
    return db.scalar(statement) or 0
