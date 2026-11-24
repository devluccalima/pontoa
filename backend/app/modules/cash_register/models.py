import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, BusinessScopedMixin, text_enum


class CashSession(BusinessScopedMixin, Base):
    """Turno de caixa: da abertura ao fechamento com conferência do dinheiro.

    Só pode haver um caixa aberto por estabelecimento.
    """

    __tablename__ = "cash_sessions"
    __table_args__ = (
        Index(
            "uq_cash_sessions_business_id_open",
            "business_id",
            unique=True,
            postgresql_where=text("closed_at IS NULL"),
        ),
        CheckConstraint("opening_amount >= 0", name="opening_amount_not_negative"),
        CheckConstraint("counted_amount >= 0", name="counted_amount_not_negative"),
        CheckConstraint(
            "(closed_at IS NULL) = (counted_amount IS NULL)", name="closing_complete"
        ),
    )

    opened_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    opened_at: Mapped[datetime] = mapped_column(server_default=func.now())
    opening_amount: Mapped[Decimal]
    # Próximo número de pedido deste turno (os pedidos recomeçam em 1).
    next_order_number: Mapped[int] = mapped_column(server_default="1")

    closed_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    closed_at: Mapped[datetime | None]
    expected_amount: Mapped[Decimal | None]
    counted_amount: Mapped[Decimal | None]
    closing_notes: Mapped[str | None] = mapped_column(String(500))

    @property
    def is_open(self) -> bool:
        return self.closed_at is None


class CashMovementKind(StrEnum):
    DEPOSIT = "deposit"  # suprimento: dinheiro colocado no caixa
    WITHDRAWAL = "withdrawal"  # sangria: dinheiro retirado do caixa


class CashMovement(BusinessScopedMixin, Base):
    """Entrada ou saída manual de dinheiro. Nunca é alterada nem apagada (RN-010)."""

    __tablename__ = "cash_movements"
    __table_args__ = (CheckConstraint("amount > 0", name="amount_positive"),)

    cash_session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cash_sessions.id", ondelete="RESTRICT"), index=True
    )
    kind: Mapped[CashMovementKind] = mapped_column(text_enum(CashMovementKind, "kind"))
    amount: Mapped[Decimal]
    description: Mapped[str] = mapped_column(String(200))
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
