import uuid
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field

from app.core.schemas import PartialUpdate, RequestBody
from app.modules.users.models import UserRole

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128


def normalize_email(value: str) -> str:
    return value.strip().lower()


Email = Annotated[EmailStr, AfterValidator(normalize_email)]
Password = Annotated[
    str, Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
]
Name = Annotated[str, Field(min_length=1, max_length=120)]


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    role: UserRole
    active: bool
    created_at: datetime


class UserCreate(RequestBody):
    name: Name
    email: Email
    password: Password
    role: UserRole = UserRole.OPERATOR


class UserUpdate(PartialUpdate):
    name: Name | None = None
    role: UserRole | None = None
    active: bool | None = None
    password: Password | None = None
