import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, ForbiddenError, NotFoundError
from app.db.scoping import get_for_business
from app.modules.cash_register.service import get_open_session, require_open_session
from app.modules.catalog.models import Product
from app.modules.orders.models import (
    STATUS_FLOW,
    Order,
    OrderItem,
    OrderStatus,
)
from app.modules.orders.schemas import OrderCancel, OrderCreate
from app.modules.users.models import User, UserRole


def create_order(db: Session, user: User, data: OrderCreate) -> Order:
    # Bloqueia o caixa: dois pedidos simultâneos não recebem o mesmo número.
    session = require_open_session(db, user.business_id, for_update=True)
    products = _load_products(db, user.business_id, data)

    items = []
    for item in data.items:
        product = products[item.product_id]
        items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                unit_price=product.price,
                quantity=item.quantity,
                line_total=product.price * item.quantity,
                notes=item.notes or None,
            )
        )

    order = Order(
        business_id=user.business_id,
        cash_session_id=session.id,
        number=session.next_order_number,
        customer_name=data.customer_name or None,
        notes=data.notes or None,
        status=OrderStatus.NEW,
        total=sum((item.line_total for item in items), Decimal("0")),
        created_by_id=user.id,
        items=items,
    )
    session.next_order_number += 1
    db.add(order)
    db.commit()
    return order


def _load_products(
    db: Session, business_id: uuid.UUID, data: OrderCreate
) -> dict[uuid.UUID, Product]:
    """Produtos do pedido, todos do estabelecimento e disponíveis."""
    requested = {item.product_id for item in data.items}
    found = db.scalars(
        select(Product).where(
            Product.business_id == business_id, Product.id.in_(requested)
        )
    )
    products = {product.id: product for product in found}

    if requested - products.keys():
        raise NotFoundError("Produto não encontrado.")
    unavailable = sorted(p.name for p in products.values() if not p.active)
    if unavailable:
        raise BusinessRuleError(f"Produto indisponível: {', '.join(unavailable)}.")
    return products


def get_order(
    db: Session,
    business_id: uuid.UUID,
    order_id: uuid.UUID,
    *,
    for_update: bool = False,
) -> Order:
    return get_for_business(
        db,
        Order,
        business_id,
        order_id,
        "Pedido não encontrado.",
        for_update=for_update,
    )


def list_orders(
    db: Session,
    business_id: uuid.UUID,
    *,
    cash_session_id: uuid.UUID | None = None,
    statuses: list[OrderStatus] | None = None,
) -> list[Order]:
    """Pedidos de um caixa (padrão: o caixa aberto), do mais antigo ao mais novo."""
    if cash_session_id is None:
        session = get_open_session(db, business_id)
        if session is None:
            return []
        cash_session_id = session.id

    statement = select(Order).where(
        Order.business_id == business_id, Order.cash_session_id == cash_session_id
    )
    if statuses:
        statement = statement.where(Order.status.in_(statuses))
    return list(db.scalars(statement.order_by(Order.number)))


def change_status(db: Session, order: Order, status: OrderStatus) -> Order:
    """Avança o pedido no fluxo de preparo; pode pular etapas, nunca voltar."""
    if order.status == OrderStatus.CANCELLED:
        raise BusinessRuleError("O pedido está cancelado.")
    if status == OrderStatus.CANCELLED:
        raise BusinessRuleError("Use o cancelamento, informando o motivo.")
    if STATUS_FLOW.index(status) <= STATUS_FLOW.index(order.status):
        raise BusinessRuleError("O pedido só pode avançar no preparo.")

    order.status = status
    if status == OrderStatus.DELIVERED:
        order.delivered_at = datetime.now(UTC)
    db.commit()
    return order


def cancel_order(db: Session, user: User, order: Order, data: OrderCancel) -> Order:
    """O operador cancela só pedidos novos; o dono cancela em qualquer etapa."""
    if order.status == OrderStatus.CANCELLED:
        raise BusinessRuleError("O pedido já está cancelado.")
    if user.role != UserRole.OWNER and order.status != OrderStatus.NEW:
        raise ForbiddenError(
            "Depois que o preparo começa, só o dono pode cancelar o pedido."
        )

    order.status = OrderStatus.CANCELLED
    order.cancelled_at = datetime.now(UTC)
    order.cancelled_by_id = user.id
    order.cancel_reason = data.reason
    db.commit()
    return order
