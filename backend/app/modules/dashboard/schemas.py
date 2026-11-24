import uuid
from datetime import date

from pydantic import BaseModel

from app.core.schemas import Money
from app.modules.payments.models import PaymentMethod


class TopProduct(BaseModel):
    product_id: uuid.UUID
    name: str
    quantity: int
    revenue: Money


class ReceivedByMethod(BaseModel):
    method: PaymentMethod
    amount: Money


class DashboardRead(BaseModel):
    """Indicadores do período, em dias do fuso do estabelecimento (inclusivo)."""

    start: date
    end: date
    timezone: str
    sales_total: Money
    orders_count: int
    cancelled_count: int
    average_ticket: Money
    received_total: Money
    received_by_method: list[ReceivedByMethod]
    receivable_total: Money
    top_products: list[TopProduct]
