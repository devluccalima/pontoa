"""Estoque por produto (ADR-0012).

O saldo fica em `Product.stock_quantity`; cada mudança gera um
`StockMovement`. Toda alteração de saldo bloqueia a linha do produto, então
duas vendas simultâneas da última unidade não passam as duas.
"""

import uuid
from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError
from app.db.scoping import get_for_business
from app.modules.catalog.models import Product
from app.modules.orders.models import Order
from app.modules.stock.models import StockMovement, StockMovementKind
from app.modules.stock.schemas import StockSet
from app.modules.users.models import User

PRODUCT_NOT_FOUND = "Produto não encontrado."
MOVEMENTS_LIMIT = 100


def set_stock(
    db: Session, user: User, product_id: uuid.UUID, data: StockSet
) -> Product:
    """Define o saldo; liga o controle de estoque se ainda estava desligado."""
    product = _lock_product(db, user.business_id, product_id)
    previous = product.stock_quantity or 0
    product.stock_quantity = data.quantity
    db.add(
        _movement(
            user,
            product,
            StockMovementKind.ADJUSTMENT,
            data.quantity - previous,
            reason=data.reason or None,
        )
    )
    db.commit()
    return product


def disable_stock(db: Session, user: User, product_id: uuid.UUID) -> Product:
    """Desliga o controle: o produto volta a ser vendido sem limite."""
    product = _lock_product(db, user.business_id, product_id)
    if product.stock_quantity is None:
        return product
    movement = _movement(
        user, product, StockMovementKind.TRACKING_OFF, -product.stock_quantity
    )
    movement.balance = None
    product.stock_quantity = None
    db.add(movement)
    db.commit()
    return product


def list_movements(
    db: Session, business_id: uuid.UUID, product_id: uuid.UUID
) -> list[StockMovement]:
    """Últimas movimentações do produto, da mais recente para a mais antiga."""
    get_for_business(db, Product, business_id, product_id, PRODUCT_NOT_FOUND)
    statement = (
        select(StockMovement)
        .where(
            StockMovement.business_id == business_id,
            StockMovement.product_id == product_id,
        )
        .order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
        .limit(MOVEMENTS_LIMIT)
    )
    return list(db.scalars(statement))


def ensure_available(
    products: dict[uuid.UUID, Product], quantities: Counter[uuid.UUID]
) -> None:
    """Recusa o pedido inteiro se algum produto não tiver saldo suficiente.

    Os produtos precisam estar bloqueados, para o saldo não mudar até a baixa.
    """
    short = sorted(
        (
            products[pid]
            for pid, quantity in quantities.items()
            if products[pid].tracks_stock
            and quantity > (products[pid].stock_quantity or 0)
        ),
        key=lambda product: product.name,
    )
    if short:
        details = ", ".join(f"{p.name} (disponível: {p.stock_quantity})" for p in short)
        raise BusinessRuleError(f"Estoque insuficiente: {details}.")


def take_for_order(
    db: Session,
    user: User,
    order: Order,
    products: dict[uuid.UUID, Product],
    quantities: Counter[uuid.UUID],
) -> None:
    """Baixa o estoque dos produtos do pedido (depois de `ensure_available`)."""
    for product_id, quantity in quantities.items():
        product = products[product_id]
        if not product.tracks_stock:
            continue
        product.stock_quantity = (product.stock_quantity or 0) - quantity
        db.add(
            _movement(
                user, product, StockMovementKind.SALE, -quantity, order_id=order.id
            )
        )


def return_for_order(db: Session, user: User, order: Order) -> None:
    """Devolve ao estoque os itens de um pedido cancelado.

    Produtos cujo controle foi desligado depois da venda ficam como estão.
    """
    quantities: Counter[uuid.UUID] = Counter()
    for item in order.items:
        quantities[item.product_id] += item.quantity

    products = db.scalars(
        select(Product)
        .where(
            Product.business_id == order.business_id,
            Product.id.in_(quantities),
            Product.stock_quantity.is_not(None),
        )
        .order_by(Product.id)
        .with_for_update()
    )
    for product in products:
        quantity = quantities[product.id]
        product.stock_quantity = (product.stock_quantity or 0) + quantity
        db.add(
            _movement(
                user,
                product,
                StockMovementKind.CANCELLATION,
                quantity,
                order_id=order.id,
            )
        )


def _lock_product(
    db: Session, business_id: uuid.UUID, product_id: uuid.UUID
) -> Product:
    return get_for_business(
        db, Product, business_id, product_id, PRODUCT_NOT_FOUND, for_update=True
    )


def _movement(
    user: User,
    product: Product,
    kind: StockMovementKind,
    quantity_change: int,
    *,
    order_id: uuid.UUID | None = None,
    reason: str | None = None,
) -> StockMovement:
    return StockMovement(
        business_id=product.business_id,
        product_id=product.id,
        kind=kind,
        quantity_change=quantity_change,
        balance=product.stock_quantity,
        order_id=order_id,
        reason=reason,
        created_by_id=user.id,
    )
