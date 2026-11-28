import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, BusinessScopedMixin, text_enum


class StockMovementKind(StrEnum):
    ADJUSTMENT = "adjustment"  # o dono informou o saldo (contagem, produção)
    SALE = "sale"  # baixa por um pedido
    CANCELLATION = "cancellation"  # devolução por um pedido cancelado
    TRACKING_OFF = "tracking_off"  # o produto deixou de ter estoque controlado


ORDER_KINDS = (StockMovementKind.SALE, StockMovementKind.CANCELLATION)


class StockMovement(BusinessScopedMixin, Base):
    """Mudança no saldo de um produto. Nunca é alterada nem apagada (RN-010)."""

    __tablename__ = "stock_movements"
    __table_args__ = (
        CheckConstraint("balance >= 0", name="balance_not_negative"),
        CheckConstraint(
            "(kind IN ('sale', 'cancellation')) = (order_id IS NOT NULL)",
            name="order_only_for_sales",
        ),
        CheckConstraint(
            "(kind = 'tracking_off') = (balance IS NULL)",
            name="balance_unless_tracking_off",
        ),
        Index("ix_stock_movements_product_id_created_at", "product_id", "created_at"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT")
    )
    kind: Mapped[StockMovementKind] = mapped_column(
        text_enum(StockMovementKind, "kind")
    )
    # Variação do saldo: negativa na venda, positiva na devolução.
    quantity_change: Mapped[int]
    # Saldo depois da mudança; None quando o controle foi desligado.
    balance: Mapped[int | None]
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("orders.id", ondelete="RESTRICT"), index=True
    )
    reason: Mapped[str | None] = mapped_column(String(200))
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
