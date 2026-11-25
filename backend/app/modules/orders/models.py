import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, BusinessScopedMixin, IdMixin, TimestampMixin, text_enum


class OrderStatus(StrEnum):
    """Status operacional, independente do pagamento (RN-002)."""

    NEW = "new"
    PREPARING = "preparing"
    READY = "ready"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


# Ordem do fluxo de preparo; um pedido só avança, nunca volta.
STATUS_FLOW = (
    OrderStatus.NEW,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.DELIVERED,
)
IN_PROGRESS = frozenset({OrderStatus.NEW, OrderStatus.PREPARING, OrderStatus.READY})


class PaymentStatus(StrEnum):
    """Status financeiro, calculado a partir dos pagamentos não estornados."""

    UNPAID = "unpaid"
    PARTIAL = "partial"
    PAID = "paid"


class Order(BusinessScopedMixin, TimestampMixin, Base):
    __tablename__ = "orders"
    __table_args__ = (
        UniqueConstraint("cash_session_id", "number"),
        CheckConstraint("total >= 0", name="total_not_negative"),
        CheckConstraint(
            "paid_amount >= 0 AND paid_amount <= total", name="paid_amount_in_range"
        ),
        CheckConstraint(
            "(status = 'cancelled') = (cancelled_at IS NOT NULL)",
            name="cancellation_complete",
        ),
        Index("ix_orders_business_id_status", "business_id", "status"),
    )

    cash_session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cash_sessions.id", ondelete="RESTRICT"), index=True
    )
    number: Mapped[int]
    customer_name: Mapped[str | None] = mapped_column(String(60))
    notes: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[OrderStatus] = mapped_column(
        text_enum(OrderStatus, "status"), default=OrderStatus.NEW
    )
    total: Mapped[Decimal]
    # Soma dos pagamentos não estornados, mantida pelo módulo de pagamentos.
    paid_amount: Mapped[Decimal] = mapped_column(
        server_default="0", default=Decimal("0")
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    delivered_at: Mapped[datetime | None]
    cancelled_at: Mapped[datetime | None]
    cancelled_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    cancel_reason: Mapped[str | None] = mapped_column(String(200))

    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order", lazy="selectin", order_by="OrderItem.id"
    )

    @property
    def payment_status(self) -> PaymentStatus:
        if self.paid_amount >= self.total:
            return PaymentStatus.PAID
        if self.paid_amount > 0:
            return PaymentStatus.PARTIAL
        return PaymentStatus.UNPAID

    @property
    def amount_due(self) -> Decimal:
        return self.total - self.paid_amount


class OrderItem(IdMixin, Base):
    """Item do pedido com nome e preço copiados do produto na venda (RN-007)."""

    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("unit_price >= 0", name="unit_price_not_negative"),
        CheckConstraint(
            "line_total = unit_price * quantity", name="line_total_matches"
        ),
    )

    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="RESTRICT"), index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), index=True
    )
    product_name: Mapped[str] = mapped_column(String(120))
    unit_price: Mapped[Decimal]
    quantity: Mapped[int]
    line_total: Mapped[Decimal]
    notes: Mapped[str | None] = mapped_column(String(120))

    order: Mapped[Order] = relationship(back_populates="items")
