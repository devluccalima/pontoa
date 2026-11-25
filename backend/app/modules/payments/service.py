import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError
from app.db.scoping import get_for_business
from app.modules.cash_register.service import require_open_session
from app.modules.orders.models import Order, OrderStatus
from app.modules.orders.service import get_order
from app.modules.payments.models import Payment
from app.modules.payments.schemas import PaymentCreate, PaymentVoid
from app.modules.users.models import User


def register_payment(
    db: Session, user: User, order_id: uuid.UUID, data: PaymentCreate
) -> Payment:
    """Registra um recebimento confirmado. Aceita pagamento parcial."""
    # Ordem dos bloqueios em todo o módulo: caixa, depois pedido.
    session = require_open_session(db, user.business_id, for_update=True)
    order = get_order(db, user.business_id, order_id, for_update=True)

    if order.status == OrderStatus.CANCELLED:
        raise BusinessRuleError("O pedido está cancelado.")
    if order.amount_due <= 0:
        raise BusinessRuleError("O pedido já está pago.")
    if data.amount > order.amount_due:
        raise BusinessRuleError(
            f"O valor é maior que o saldo do pedido (R$ {order.amount_due:.2f})."
        )

    payment = Payment(
        business_id=user.business_id,
        order_id=order.id,
        cash_session_id=session.id,
        method=data.method,
        amount=data.amount,
        received_amount=data.received_amount,
        created_by_id=user.id,
    )
    order.paid_amount += data.amount
    db.add(payment)
    db.commit()
    return payment


def get_payment(db: Session, business_id: uuid.UUID, payment_id: uuid.UUID) -> Payment:
    return get_for_business(
        db,
        Payment,
        business_id,
        payment_id,
        "Pagamento não encontrado.",
        for_update=True,
    )


def void_payment(
    db: Session, user: User, payment: Payment, data: PaymentVoid
) -> Payment:
    """Estorna um pagamento do caixa aberto; o registro permanece (RN-010)."""
    if payment.is_voided:
        raise BusinessRuleError("O pagamento já foi estornado.")
    session = require_open_session(db, user.business_id, for_update=True)
    if payment.cash_session_id != session.id:
        raise BusinessRuleError("Só é possível estornar pagamentos do caixa aberto.")

    order = get_order(db, user.business_id, payment.order_id, for_update=True)
    order.paid_amount -= payment.amount
    payment.voided_at = datetime.now(UTC)
    payment.voided_by_id = user.id
    payment.void_reason = data.reason
    db.commit()
    return payment


def list_order_payments(db: Session, order: Order) -> list[Payment]:
    statement = (
        select(Payment)
        .where(Payment.order_id == order.id)
        .order_by(Payment.created_at, Payment.id)
    )
    return list(db.scalars(statement))


def list_pending_orders(db: Session, business_id: uuid.UUID) -> list[Order]:
    """Pedidos com saldo a receber, de qualquer caixa (RN-004)."""
    statement = (
        select(Order)
        .where(
            Order.business_id == business_id,
            Order.status != OrderStatus.CANCELLED,
            Order.paid_amount < Order.total,
        )
        .order_by(Order.created_at, Order.id)
    )
    return list(db.scalars(statement))
