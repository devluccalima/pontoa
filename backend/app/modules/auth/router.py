from datetime import timedelta
from http import HTTPStatus

from fastapi import APIRouter

from app.api.dependencies import AppSettings, DbSession
from app.core.exceptions import UnauthorizedError
from app.modules.auth.dependencies import CurrentUser, SessionToken
from app.modules.auth.schemas import LoginRequest, LoginResponse, MeResponse
from app.modules.auth.service import authenticate, create_session, revoke_session
from app.modules.businesses.schemas import BusinessRead
from app.modules.users.schemas import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", summary="Entra com e-mail e senha")
def login(data: LoginRequest, db: DbSession, settings: AppSettings) -> LoginResponse:
    user = authenticate(db, data.email, data.password)
    if user is None:
        raise UnauthorizedError("E-mail ou senha inválidos.")

    ttl = timedelta(hours=settings.session_ttl_hours)
    token, expires_at = create_session(db, user, ttl)
    return LoginResponse(
        access_token=token,
        expires_at=expires_at,
        user=UserRead.model_validate(user),
        business=BusinessRead.model_validate(user.business),
    )


@router.post(
    "/logout",
    status_code=HTTPStatus.NO_CONTENT,
    summary="Encerra a sessão atual",
)
def logout(db: DbSession, token: SessionToken, user: CurrentUser) -> None:
    revoke_session(db, token)


@router.get("/me", summary="Usuário e estabelecimento da sessão atual")
def me(user: CurrentUser) -> MeResponse:
    return MeResponse(
        user=UserRead.model_validate(user),
        business=BusinessRead.model_validate(user.business),
    )
