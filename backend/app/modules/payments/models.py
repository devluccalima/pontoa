import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import CheckConstraint, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, BusinessScopedMixin, text_enum


class PaymentMethod(StrEnum):
    PIX = "pix"
    CASH = "cash"
    CARD = "card"


class Payment(BusinessScopedMixin, Base):
    """Recebimento confirmado manualmente por quem o registrou (RN-005).

    Não é alterado nem apagado; um lançamento errado é estornado (RN-010).
    """

    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint(
            "received_amount IS NULL"
            " OR (method = 'cash' AND received_amount >= amount)",
            name="received_amount_only_cash",
        ),
        CheckConstraint(
            "(voided_at IS NULL) = (void_reason IS NULL)", name="void_complete"
        ),
    )

    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="RESTRICT"), index=True
    )
    # Caixa em que o dinheiro entrou, que pode ser posterior ao do pedido.
    cash_session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cash_sessions.id", ondelete="RESTRICT"), index=True
    )
    method: Mapped[PaymentMethod] = mapped_column(text_enum(PaymentMethod, "method"))
    amount: Mapped[Decimal]
    # Valor entregue pelo cliente em dinheiro, para calcular o troco.
    received_amount: Mapped[Decimal | None]
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    voided_at: Mapped[datetime | None]
    voided_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    void_reason: Mapped[str | None] = mapped_column(String(200))

    @property
    def change(self) -> Decimal | None:
        if self.received_amount is None:
            return None
        return self.received_amount - self.amount

    @property
    def is_voided(self) -> bool:
        return self.voided_at is not None
