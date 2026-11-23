"""Registro de todos os modelos, usado pelo Alembic.

Todo modelo novo deve ser importado aqui; caso contrário,
o autogenerate não o enxerga.
"""

from app.db.base import Base
from app.modules.businesses.models import Business

__all__ = ["Base", "Business"]
