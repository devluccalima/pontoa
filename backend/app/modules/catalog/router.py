import uuid
from http import HTTPStatus

from fastapi import APIRouter

from app.api.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser, OwnerUser
from app.modules.catalog import service
from app.modules.catalog.schemas import (
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    ProductCreate,
    ProductRead,
    ProductUpdate,
)

router = APIRouter(tags=["catalog"])


@router.get("/categories", summary="Lista as categorias")
def list_categories(
    db: DbSession, user: CurrentUser, active: bool | None = None
) -> list[CategoryRead]:
    categories = service.list_categories(db, user.business_id, active)
    return [CategoryRead.model_validate(category) for category in categories]


@router.post(
    "/categories", status_code=HTTPStatus.CREATED, summary="Cadastra uma categoria"
)
def create_category(
    data: CategoryCreate, db: DbSession, owner: OwnerUser
) -> CategoryRead:
    category = service.create_category(db, owner.business_id, data)
    return CategoryRead.model_validate(category)


@router.patch("/categories/{category_id}", summary="Altera ou desativa uma categoria")
def update_category(
    category_id: uuid.UUID, data: CategoryUpdate, db: DbSession, owner: OwnerUser
) -> CategoryRead:
    category = service.get_category(db, owner.business_id, category_id)
    category = service.update_category(db, category, data)
    return CategoryRead.model_validate(category)


@router.get("/products", summary="Lista os produtos")
def list_products(
    db: DbSession,
    user: CurrentUser,
    active: bool | None = None,
    category_id: uuid.UUID | None = None,
) -> list[ProductRead]:
    products = service.list_products(db, user.business_id, active, category_id)
    return [ProductRead.model_validate(product) for product in products]


@router.get("/products/{product_id}", summary="Consulta um produto")
def get_product(product_id: uuid.UUID, db: DbSession, user: CurrentUser) -> ProductRead:
    product = service.get_product(db, user.business_id, product_id)
    return ProductRead.model_validate(product)


@router.post("/products", status_code=HTTPStatus.CREATED, summary="Cadastra um produto")
def create_product(data: ProductCreate, db: DbSession, owner: OwnerUser) -> ProductRead:
    product = service.create_product(db, owner.business_id, data)
    return ProductRead.model_validate(product)


@router.patch(
    "/products/{product_id}", summary="Altera preço, dados ou disponibilidade"
)
def update_product(
    product_id: uuid.UUID, data: ProductUpdate, db: DbSession, owner: OwnerUser
) -> ProductRead:
    product = service.get_product(db, owner.business_id, product_id)
    product = service.update_product(db, product, data)
    return ProductRead.model_validate(product)
