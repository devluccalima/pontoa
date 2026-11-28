import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.core.schemas import RequestBody
from app.modules.stock.models import StockMovementKind

Quantity = Annotated[int, Field(ge=0, le=100_000)]
Reason = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]


class StockSet(RequestBody):
    """Saldo atual do produto, por exemplo depois de contar ou produzir."""

    quantity: Quantity
    reason: Reason | None = None


class StockMovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    kind: StockMovementKind
    quantity_change: int
    balance: int | None
    order_id: uuid.UUID | None
    reason: str | None
    created_by_id: uuid.UUID
    created_at: datetime
