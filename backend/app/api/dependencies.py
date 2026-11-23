"""Dependências compartilhadas pelas rotas."""

from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import get_db


def get_app_settings(request: Request) -> Settings:
    """Configurações da aplicação que está atendendo a requisição."""
    return request.app.state.settings


DbSession = Annotated[Session, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_app_settings)]
