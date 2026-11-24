import logging
from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.exceptions import ServiceUnavailableError
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok"]


@router.get("/health", summary="Verifica se a API está respondendo")
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/health/ready", summary="Verifica se a API consegue acessar o banco")
def readiness(db: Annotated[Session, Depends(get_db)]) -> HealthResponse:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.warning("Banco de dados indisponível: %s", type(exc).__name__)
        raise ServiceUnavailableError() from exc
    return HealthResponse(status="ok")
