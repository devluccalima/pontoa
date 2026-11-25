import uuid
from typing import Annotated, ClassVar

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.core.schemas import Money, PartialUpdate, RequestBody

CategoryName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)
]
ProductName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
Position = Annotated[int, Field(ge=0, le=10_000)]


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    position: int
    active: bool


class CategoryCreate(RequestBody):
    name: CategoryName
    position: Position = 0


class CategoryUpdate(PartialUpdate):
    name: CategoryName | None = None
    position: Position | None = None
    active: bool | None = None


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category_id: uuid.UUID | None
    name: str
    description: str | None
    price: Money
    position: int
    active: bool


class ProductCreate(RequestBody):
    name: ProductName
    price: Money
    category_id: uuid.UUID | None = None
    description: Description | None = None
    position: Position = 0


class ProductUpdate(PartialUpdate):
    """`category_id` e `description` aceitam null para limpar o valor."""

    nullable_fields: ClassVar[frozenset[str]] = frozenset(
        {"category_id", "description"}
    )

    name: ProductName | None = None
    price: Money | None = None
    category_id: uuid.UUID | None = None
    description: Description | None = None
    position: Position | None = None
    active: bool | None = None
