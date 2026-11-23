import uuid
from enum import StrEnum

from sqlalchemy import Enum, ForeignKey, String, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin
from app.modules.businesses.models import Business


class UserRole(StrEnum):
    OWNER = "owner"
    OPERATOR = "operator"


class User(IdMixin, TimestampMixin, Base):
    """Pessoa que usa o sistema; pertence a um único estabelecimento."""

    __tablename__ = "users"

    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("businesses.id", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            name="role",
            native_enum=False,
            create_constraint=True,
            length=20,
            values_callable=lambda roles: [role.value for role in roles],
        )
    )
    active: Mapped[bool] = mapped_column(server_default=true())

    business: Mapped[Business] = relationship(lazy="joined")
