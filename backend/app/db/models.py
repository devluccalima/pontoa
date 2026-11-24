"""Registro de todos os modelos, usado pelo Alembic.

Todo modelo novo deve ser importado aqui; caso contrário,
o autogenerate não o enxerga.
"""

from app.db.base import Base
from app.modules.auth.models import UserSession
from app.modules.businesses.models import Business
from app.modules.cash_register.models import CashMovement, CashSession
from app.modules.catalog.models import Category, Product
from app.modules.users.models import User

__all__ = [
    "Base",
    "Business",
    "CashMovement",
    "CashSession",
    "Category",
    "Product",
    "User",
    "UserSession",
]
