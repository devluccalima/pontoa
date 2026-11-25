import uuid
from http import HTTPStatus

from fastapi import APIRouter

from app.api.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser, OwnerUser
from app.modules.orders.schemas import OrderRead
from app.modules.orders.service import get_order
from app.modules.payments import service
from app.modules.payments.schemas import PaymentCreate, PaymentRead, PaymentVoid

router = APIRouter(tags=["payments"])


@router.get(
    "/orders/pending-payments",
    summary="Pedidos com saldo a receber, de qualquer caixa",
)
def list_pending(db: DbSession, user: CurrentUser) -> list[OrderRead]:
    orders = service.list_pending_orders(db, user.business_id)
    return [OrderRead.model_validate(order) for order in orders]


@router.post(
    "/orders/{order_id}/payments",
    status_code=HTTPStatus.CREATED,
    summary="Registra um recebimento (Pix, dinheiro ou cartão)",
)
def register_payment(
    order_id: uuid.UUID, data: PaymentCreate, db: DbSession, user: CurrentUser
) -> PaymentRead:
    payment = service.register_payment(db, user, order_id, data)
    return PaymentRead.model_validate(payment)


@router.get("/orders/{order_id}/payments", summary="Pagamentos de um pedido")
def list_order_payments(
    order_id: uuid.UUID, db: DbSession, user: CurrentUser
) -> list[PaymentRead]:
    order = get_order(db, user.business_id, order_id)
    payments = service.list_order_payments(db, order)
    return [PaymentRead.model_validate(payment) for payment in payments]


@router.post("/payments/{payment_id}/void", summary="Estorna um pagamento, com motivo")
def void_payment(
    payment_id: uuid.UUID, data: PaymentVoid, db: DbSession, owner: OwnerUser
) -> PaymentRead:
    payment = service.get_payment(db, owner.business_id, payment_id)
    payment = service.void_payment(db, owner, payment, data)
    return PaymentRead.model_validate(payment)
