import uuid

from fastapi import APIRouter

from app.api.dependencies import DbSession
from app.modules.auth.dependencies import OwnerUser
from app.modules.catalog.schemas import ProductRead
from app.modules.stock import service
from app.modules.stock.schemas import StockMovementRead, StockSet

router = APIRouter(tags=["stock"])


@router.put(
    "/products/{product_id}/stock",
    summary="Define o saldo em estoque e liga o controle",
)
def set_stock(
    product_id: uuid.UUID, data: StockSet, db: DbSession, owner: OwnerUser
) -> ProductRead:
    product = service.set_stock(db, owner, product_id, data)
    return ProductRead.model_validate(product)


@router.delete(
    "/products/{product_id}/stock",
    summary="Desliga o controle de estoque do produto",
)
def disable_stock(
    product_id: uuid.UUID, db: DbSession, owner: OwnerUser
) -> ProductRead:
    product = service.disable_stock(db, owner, product_id)
    return ProductRead.model_validate(product)


@router.get(
    "/products/{product_id}/stock/movements",
    summary="Lista as últimas movimentações de estoque do produto",
)
def list_movements(
    product_id: uuid.UUID, db: DbSession, owner: OwnerUser
) -> list[StockMovementRead]:
    movements = service.list_movements(db, owner.business_id, product_id)
    return [StockMovementRead.model_validate(movement) for movement in movements]
