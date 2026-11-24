from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.modules.businesses.schemas import BusinessRead
from app.modules.users.schemas import PASSWORD_MAX_LENGTH, UserRead


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


class MeResponse(BaseModel):
    user: UserRead
    business: BusinessRead


class LoginResponse(MeResponse):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: datetime
