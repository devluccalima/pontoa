import uuid
from functools import cache
from typing import Annotated
from zoneinfo import available_timezones

from pydantic import AfterValidator, BaseModel, ConfigDict, Field


@cache
def _known_timezones() -> frozenset[str]:
    return frozenset(available_timezones())


def validate_timezone(value: str) -> str:
    if value not in _known_timezones():
        raise ValueError("Fuso horário desconhecido. Exemplo: America/Sao_Paulo.")
    return value


Timezone = Annotated[str, AfterValidator(validate_timezone)]


class BusinessRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    timezone: str


class BusinessUpdate(BaseModel):
    """Campos ausentes não são alterados."""

    name: Annotated[str, Field(min_length=1, max_length=120)] | None = None
    timezone: Timezone | None = None
