"""Consultas restritas ao estabelecimento do usuário autenticado."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.db.base import BusinessScopedMixin


def get_for_business[T: BusinessScopedMixin](
    db: Session,
    model: type[T],
    business_id: uuid.UUID,
    record_id: uuid.UUID,
    not_found_message: str,
    *,
    for_update: bool = False,
) -> T:
    """Busca um registro do estabelecimento; de outro estabelecimento é 404.

    Com `for_update`, a linha fica bloqueada até o fim da transação.
    """
    statement = select(model).where(
        model.id == record_id,
        model.business_id == business_id,
    )
    if for_update:
        statement = statement.with_for_update()
    record = db.scalar(statement)
    if record is None:
        raise NotFoundError(not_found_message)
    return record
