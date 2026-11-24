import uuid
from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser, OwnerUser
from app.modules.cash_register import service
from app.modules.cash_register.schemas import (
    CashMovementCreate,
    CashMovementRead,
    CashSessionClose,
    CashSessionOpen,
    CashSessionRead,
    CurrentCashSession,
)

router = APIRouter(prefix="/cash-sessions", tags=["cash register"])


@router.get("/current", summary="Caixa aberto no momento, se houver")
def get_current(db: DbSession, user: CurrentUser) -> CurrentCashSession:
    session = service.get_open_session(db, user.business_id)
    return CurrentCashSession(
        session=None if session is None else service.to_read(db, session)
    )


@router.post("", status_code=HTTPStatus.CREATED, summary="Abre o caixa")
def open_session(
    data: CashSessionOpen, db: DbSession, owner: OwnerUser
) -> CashSessionRead:
    session = service.open_session(db, owner, data)
    return service.to_read(db, session)


@router.post(
    "/current/movements",
    status_code=HTTPStatus.CREATED,
    summary="Registra suprimento ou sangria no caixa aberto",
)
def add_movement(
    data: CashMovementCreate, db: DbSession, owner: OwnerUser
) -> CashMovementRead:
    movement = service.add_movement(db, owner, data)
    return CashMovementRead.model_validate(movement)


@router.post("/current/close", summary="Fecha o caixa com o valor contado")
def close_session(
    data: CashSessionClose, db: DbSession, owner: OwnerUser
) -> CashSessionRead:
    session = service.close_session(db, owner, data)
    return service.to_read(db, session)


@router.get("", summary="Histórico de caixas, do mais recente")
def list_sessions(
    db: DbSession,
    owner: OwnerUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
) -> list[CashSessionRead]:
    sessions = service.list_sessions(db, owner.business_id, limit)
    return [service.to_read(db, session) for session in sessions]


@router.get("/{session_id}", summary="Consulta um caixa")
def get_session(
    session_id: uuid.UUID, db: DbSession, owner: OwnerUser
) -> CashSessionRead:
    session = service.get_session(db, owner.business_id, session_id)
    return service.to_read(db, session)


@router.get("/{session_id}/movements", summary="Suprimentos e sangrias de um caixa")
def list_movements(
    session_id: uuid.UUID, db: DbSession, owner: OwnerUser
) -> list[CashMovementRead]:
    session = service.get_session(db, owner.business_id, session_id)
    movements = service.list_movements(db, session)
    return [CashMovementRead.model_validate(movement) for movement in movements]
