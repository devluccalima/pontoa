import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.core.schemas import Money, PositiveMoney, RequestBody, SignedMoney
from app.modules.cash_register.models import CashMovementKind

Notes = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
Description = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]


class CashSessionOpen(RequestBody):
    opening_amount: Money


class CashSessionClose(RequestBody):
    counted_amount: Money
    notes: Notes | None = None


class CashMovementCreate(RequestBody):
    kind: CashMovementKind
    amount: PositiveMoney
    description: Description


class CashMovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: CashMovementKind
    amount: Money
    description: str
    created_by_id: uuid.UUID
    created_at: datetime


class CashSummary(BaseModel):
    """Dinheiro em espécie que deveria estar na gaveta."""

    opening_amount: Money
    deposits: Money
    withdrawals: Money
    cash_payments: Money
    expected_amount: SignedMoney


class CashSessionRead(BaseModel):
    id: uuid.UUID
    is_open: bool
    opened_by_id: uuid.UUID
    opened_at: datetime
    closed_by_id: uuid.UUID | None
    closed_at: datetime | None
    counted_amount: Money | None
    difference: SignedMoney | None
    closing_notes: str | None
    summary: CashSummary


class CurrentCashSession(BaseModel):
    """Estado do caixa: `session` é null quando não há caixa aberto."""

    session: CashSessionRead | None


def difference(counted: Decimal | None, expected: Decimal) -> Decimal | None:
    """Sobra (positivo) ou falta (negativo) na conferência."""
    return None if counted is None else counted - expected
