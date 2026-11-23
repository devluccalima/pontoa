import uuid
from http import HTTPStatus

from fastapi import APIRouter

from app.api.dependencies import DbSession
from app.modules.auth.dependencies import OwnerUser
from app.modules.users import service
from app.modules.users.schemas import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", summary="Lista os usuários do estabelecimento")
def list_users(db: DbSession, owner: OwnerUser) -> list[UserRead]:
    users = service.list_users(db, owner.business_id)
    return [UserRead.model_validate(user) for user in users]


@router.post("", status_code=HTTPStatus.CREATED, summary="Cadastra um usuário")
def create_user(data: UserCreate, db: DbSession, owner: OwnerUser) -> UserRead:
    user = service.create_user(db, owner.business_id, data)
    return UserRead.model_validate(user)


@router.get("/{user_id}", summary="Consulta um usuário")
def get_user(user_id: uuid.UUID, db: DbSession, owner: OwnerUser) -> UserRead:
    user = service.get_user(db, owner.business_id, user_id)
    return UserRead.model_validate(user)


@router.patch("/{user_id}", summary="Altera nome, papel, senha ou acesso")
def update_user(
    user_id: uuid.UUID, data: UserUpdate, db: DbSession, owner: OwnerUser
) -> UserRead:
    user = service.get_user(db, owner.business_id, user_id)
    user = service.update_user(db, user, data)
    return UserRead.model_validate(user)
