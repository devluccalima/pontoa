from fastapi import APIRouter

from app.api.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser, OwnerUser
from app.modules.businesses.schemas import BusinessRead, BusinessUpdate

router = APIRouter(prefix="/business", tags=["business"])


@router.get("", summary="Estabelecimento do usuário autenticado")
def get_business(user: CurrentUser) -> BusinessRead:
    return BusinessRead.model_validate(user.business)


@router.patch("", summary="Altera os dados do estabelecimento")
def update_business(
    data: BusinessUpdate, db: DbSession, owner: OwnerUser
) -> BusinessRead:
    business = owner.business
    for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(business, field, value)
    db.commit()
    return BusinessRead.model_validate(business)
