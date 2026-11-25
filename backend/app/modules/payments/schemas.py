import uuid
from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

from app.core.schemas import Money, PositiveMoney, RequestBody
from app.modules.payments.models import PaymentMethod

VoidReason = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=3, max_length=200)
]


class PaymentCreate(RequestBody):
    method: PaymentMethod
    amount: PositiveMoney
    # Só para dinheiro: quanto o cliente entregou, para calcular o troco.
    received_amount: PositiveMoney | None = None

    @model_validator(mode="after")
    def check_received_amount(self) -> Self:
        if self.received_amount is None:
            return self
        if self.method != PaymentMethod.CASH:
            raise ValueError("Valor recebido só se aplica a pagamento em dinheiro.")
        if self.received_amount < self.amount:
            raise ValueError("O valor recebido é menor que o valor pago.")
        return self


class PaymentVoid(RequestBody):
    reason: VoidReason


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    cash_session_id: uuid.UUID
    method: PaymentMethod
    amount: Money
    received_amount: Money | None
    change: Money | None
    created_by_id: uuid.UUID
    created_at: datetime
    is_voided: bool
    voided_at: datetime | None
    voided_by_id: uuid.UUID | None
    void_reason: str | None
