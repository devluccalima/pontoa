from sqlalchemy import String, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin

DEFAULT_TIMEZONE = "America/Sao_Paulo"


class Business(IdMixin, TimestampMixin, Base):
    """Estabelecimento: a raiz do isolamento multinegócio."""

    __tablename__ = "businesses"

    name: Mapped[str] = mapped_column(String(120))
    timezone: Mapped[str] = mapped_column(String(64), server_default=DEFAULT_TIMEZONE)
    active: Mapped[bool] = mapped_column(server_default=true())
