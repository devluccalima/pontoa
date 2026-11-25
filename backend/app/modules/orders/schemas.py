import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.core.schemas import Money, RequestBody
from app.modules.orders.models import OrderStatus, PaymentStatus

ItemNotes = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)]
CustomerName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=60)]
OrderNotes = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]
CancelReason = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=3, max_length=200)
]


class OrderItemCreate(RequestBody):
    product_id: uuid.UUID
    quantity: Annotated[int, Field(ge=1, le=99)] = 1
    notes: ItemNotes | None = None


class OrderCreate(RequestBody):
    items: Annotated[list[OrderItemCreate], Field(min_length=1, max_length=50)]
    customer_name: CustomerName | None = None
    notes: OrderNotes | None = None


class OrderStatusChange(RequestBody):
    status: OrderStatus


class OrderCancel(RequestBody):
    reason: CancelReason


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    unit_price: Money
    quantity: int
    line_total: Money
    notes: str | None


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    cash_session_id: uuid.UUID
    number: int
    customer_name: str | None
    notes: str | None
    status: OrderStatus
    total: Money
    paid_amount: Money
    amount_due: Money
    payment_status: PaymentStatus
    items: list[OrderItemRead]
    created_by_id: uuid.UUID
    created_at: datetime
    delivered_at: datetime | None
    cancelled_at: datetime | None
    cancelled_by_id: uuid.UUID | None
    cancel_reason: str | None
