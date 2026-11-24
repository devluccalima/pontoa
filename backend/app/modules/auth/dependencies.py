from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.dependencies import DbSession
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.modules.auth.service import get_session_user
from app.modules.users.models import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False, description="Token recebido no login")

BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
]


def get_session_token(credentials: BearerCredentials) -> str:
    if credentials is None:
        raise UnauthorizedError()
    return credentials.credentials


SessionToken = Annotated[str, Depends(get_session_token)]


def get_current_user(db: DbSession, token: SessionToken) -> User:
    """Usuário autenticado; o estabelecimento dele define o que pode ser acessado."""
    user = get_session_user(db, token)
    if user is None:
        raise UnauthorizedError("Sessão inválida ou expirada. Entre novamente.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_owner(user: CurrentUser) -> User:
    if user.role != UserRole.OWNER:
        raise ForbiddenError("Apenas o dono do estabelecimento pode fazer isso.")
    return user


OwnerUser = Annotated[User, Depends(require_owner)]
