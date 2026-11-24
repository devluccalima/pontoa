import uuid
from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser
from app.modules.orders import service
from app.modules.orders.models import OrderStatus
from app.modules.orders.schemas import (
    OrderCancel,
    OrderCreate,
    OrderRead,
    OrderStatusChange,
)

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", status_code=HTTPStatus.CREATED, summary="Registra um pedido")
def create_order(data: OrderCreate, db: DbSession, user: CurrentUser) -> OrderRead:
    order = service.create_order(db, user, data)
    return OrderRead.model_validate(order)


@router.get("", summary="Pedidos do caixa aberto (ou de outro caixa)")
def list_orders(
    db: DbSession,
    user: CurrentUser,
    status: Annotated[list[OrderStatus] | None, Query()] = None,
    cash_session_id: uuid.UUID | None = None,
) -> list[OrderRead]:
    orders = service.list_orders(
        db, user.business_id, cash_session_id=cash_session_id, statuses=status
    )
    return [OrderRead.model_validate(order) for order in orders]


@router.get("/{order_id}", summary="Consulta um pedido")
def get_order(order_id: uuid.UUID, db: DbSession, user: CurrentUser) -> OrderRead:
    order = service.get_order(db, user.business_id, order_id)
    return OrderRead.model_validate(order)


@router.post("/{order_id}/status", summary="Avança o pedido no preparo")
def change_status(
    order_id: uuid.UUID, data: OrderStatusChange, db: DbSession, user: CurrentUser
) -> OrderRead:
    order = service.get_order(db, user.business_id, order_id, for_update=True)
    order = service.change_status(db, order, data.status)
    return OrderRead.model_validate(order)


@router.post("/{order_id}/cancel", summary="Cancela o pedido, com motivo")
def cancel_order(
    order_id: uuid.UUID, data: OrderCancel, db: DbSession, user: CurrentUser
) -> OrderRead:
    order = service.get_order(db, user.business_id, order_id, for_update=True)
    order = service.cancel_order(db, user, order, data)
    return OrderRead.model_validate(order)
