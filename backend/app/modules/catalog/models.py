import uuid
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, BusinessScopedMixin, TimestampMixin


class Category(BusinessScopedMixin, TimestampMixin, Base):
    """Agrupa produtos na tela de vendas (ex.: Arepas, Bebidas)."""

    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("business_id", "name"),)

    name: Mapped[str] = mapped_column(String(60))
    position: Mapped[int] = mapped_column(server_default="0")
    active: Mapped[bool] = mapped_column(server_default=true())


class Product(BusinessScopedMixin, TimestampMixin, Base):
    """Item vendido. O preço vigente é copiado para o pedido (RN-007)."""

    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("business_id", "name"),
        CheckConstraint("price >= 0", name="price_not_negative"),
        CheckConstraint("stock_quantity >= 0", name="stock_quantity_not_negative"),
    )

    category_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(String(500))
    price: Mapped[Decimal]
    position: Mapped[int] = mapped_column(server_default="0")
    active: Mapped[bool] = mapped_column(server_default=true())
    # Saldo em estoque; None quando o produto não tem estoque controlado (ADR-0012).
    stock_quantity: Mapped[int | None]

    @property
    def tracks_stock(self) -> bool:
        return self.stock_quantity is not None
