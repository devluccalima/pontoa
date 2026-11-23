import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError
from app.db.scoping import get_for_business
from app.modules.catalog.models import Category, Product
from app.modules.catalog.schemas import (
    CategoryCreate,
    CategoryUpdate,
    ProductCreate,
    ProductUpdate,
)

DUPLICATE_CATEGORY = "Já existe uma categoria com este nome."
DUPLICATE_PRODUCT = "Já existe um produto com este nome."


def list_categories(
    db: Session, business_id: uuid.UUID, active: bool | None = None
) -> list[Category]:
    statement = select(Category).where(Category.business_id == business_id)
    if active is not None:
        statement = statement.where(Category.active.is_(active))
    return list(db.scalars(statement.order_by(Category.position, Category.name)))


def get_category(
    db: Session, business_id: uuid.UUID, category_id: uuid.UUID
) -> Category:
    return get_for_business(
        db, Category, business_id, category_id, "Categoria não encontrada."
    )


def create_category(
    db: Session, business_id: uuid.UUID, data: CategoryCreate
) -> Category:
    _ensure_unique_name(db, Category, business_id, data.name, DUPLICATE_CATEGORY)
    category = Category(business_id=business_id, **data.model_dump())
    db.add(category)
    _commit(db, DUPLICATE_CATEGORY)
    return category


def update_category(db: Session, category: Category, data: CategoryUpdate) -> Category:
    changes = data.changes()
    if "name" in changes:
        _ensure_unique_name(
            db,
            Category,
            category.business_id,
            str(changes["name"]),
            DUPLICATE_CATEGORY,
            exclude_id=category.id,
        )
    for field, value in changes.items():
        setattr(category, field, value)
    _commit(db, DUPLICATE_CATEGORY)
    return category


def list_products(
    db: Session,
    business_id: uuid.UUID,
    active: bool | None = None,
    category_id: uuid.UUID | None = None,
) -> list[Product]:
    statement = select(Product).where(Product.business_id == business_id)
    if active is not None:
        statement = statement.where(Product.active.is_(active))
    if category_id is not None:
        statement = statement.where(Product.category_id == category_id)
    return list(db.scalars(statement.order_by(Product.position, Product.name)))


def get_product(db: Session, business_id: uuid.UUID, product_id: uuid.UUID) -> Product:
    return get_for_business(
        db, Product, business_id, product_id, "Produto não encontrado."
    )


def create_product(db: Session, business_id: uuid.UUID, data: ProductCreate) -> Product:
    _ensure_unique_name(db, Product, business_id, data.name, DUPLICATE_PRODUCT)
    if data.category_id is not None:
        get_category(db, business_id, data.category_id)
    product = Product(business_id=business_id, **data.model_dump())
    db.add(product)
    _commit(db, DUPLICATE_PRODUCT)
    return product


def update_product(db: Session, product: Product, data: ProductUpdate) -> Product:
    changes = data.changes()
    if "name" in changes:
        _ensure_unique_name(
            db,
            Product,
            product.business_id,
            str(changes["name"]),
            DUPLICATE_PRODUCT,
            exclude_id=product.id,
        )
    category_id = changes.get("category_id")
    if isinstance(category_id, uuid.UUID):
        # Categoria de outro estabelecimento é tratada como inexistente.
        get_category(db, product.business_id, category_id)
    for field, value in changes.items():
        setattr(product, field, value)
    _commit(db, DUPLICATE_PRODUCT)
    return product


def _ensure_unique_name(
    db: Session,
    model: type[Category] | type[Product],
    business_id: uuid.UUID,
    name: str,
    message: str,
    exclude_id: uuid.UUID | None = None,
) -> None:
    """Nomes são únicos por estabelecimento, sem diferenciar maiúsculas."""
    statement = select(model.id).where(
        model.business_id == business_id,
        func.lower(model.name) == name.lower(),
    )
    if exclude_id is not None:
        statement = statement.where(model.id != exclude_id)
    if db.scalar(statement) is not None:
        raise BusinessRuleError(message)


def _commit(db: Session, duplicate_message: str) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        # Dois cadastros simultâneos com o mesmo nome: o banco decide.
        db.rollback()
        raise BusinessRuleError(duplicate_message) from exc
