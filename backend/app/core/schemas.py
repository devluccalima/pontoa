from decimal import Decimal
from typing import Annotated, ClassVar, Self

from pydantic import BaseModel, Field, PlainSerializer, model_validator

MONEY_MAX_DIGITS = 10

Money = Annotated[
    Decimal,
    Field(ge=0, max_digits=MONEY_MAX_DIGITS, decimal_places=2),
    PlainSerializer(lambda value: f"{value:.2f}", return_type=str, when_used="json"),
]
"""Valor em reais: nunca negativo, até 2 casas, enviado como texto ("18.50")."""


class PartialUpdate(BaseModel):
    """Corpo de PATCH: campos ausentes não mudam.

    Só os campos em `nullable_fields` aceitam `null`, para limpar o valor.
    """

    nullable_fields: ClassVar[frozenset[str]] = frozenset()

    @model_validator(mode="after")
    def reject_null_in_required_fields(self) -> Self:
        for field in self.model_fields_set - self.nullable_fields:
            if getattr(self, field) is None:
                raise ValueError(f"O campo '{field}' não pode ser nulo.")
        return self

    def changes(self) -> dict[str, object]:
        """Somente os campos enviados na requisição."""
        return self.model_dump(exclude_unset=True)
