import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.exceptions import AppError
from app.core.request_context import REQUEST_ID_HEADER, get_request_id

logger = logging.getLogger(__name__)

HTTP_ERROR_MESSAGES: dict[int, str] = {
    HTTPStatus.NOT_FOUND: "Recurso não encontrado.",
    HTTPStatus.METHOD_NOT_ALLOWED: "Método não permitido para este recurso.",
}


class ErrorDetail(BaseModel):
    field: str
    message: str
    type: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = []


class ErrorResponse(BaseModel):
    error: ErrorBody


def error_response(
    status_code: int,
    code: str,
    message: str,
    details: list[ErrorDetail] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorBody(code=code, message=message, details=details or []),
    )
    return JSONResponse(
        status_code=status_code,
        content=body.model_dump(),
        headers=headers,
    )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message)


async def http_error_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    status = HTTPStatus(exc.status_code)
    return error_response(
        status_code=status,
        code=status.name.lower(),
        message=HTTP_ERROR_MESSAGES.get(status, status.phrase),
        headers=exc.headers,
    )


async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    details = [
        ErrorDetail(
            field=".".join(str(part) for part in error["loc"]),
            message=error["msg"],
            type=error["type"],
        )
        for error in exc.errors()
    ]
    return error_response(
        HTTPStatus.UNPROCESSABLE_ENTITY,
        "validation_error",
        "Dados inválidos.",
        details,
    )


def internal_error_response(headers: dict[str, str] | None = None) -> JSONResponse:
    return error_response(
        HTTPStatus.INTERNAL_SERVER_ERROR,
        "internal_error",
        "Ocorreu um erro interno. Tente novamente.",
        headers=headers,
    )


def log_unhandled_error(method: str, path: str, exc: Exception) -> None:
    logger.error("Erro não tratado em %s %s", method, path, exc_info=exc)


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Última barreira: erros que escapam do UnhandledErrorMiddleware.

    Roda fora do RequestContextMiddleware, por isso adiciona o ID por conta própria.
    """
    log_unhandled_error(request.method, request.url.path, exc)
    request_id = get_request_id()
    return internal_error_response(
        headers={REQUEST_ID_HEADER: request_id} if request_id else None,
    )


class UnhandledErrorMiddleware:
    """Converte erros não tratados em resposta 500 dentro da pilha de middlewares.

    Fica por dentro do CORSMiddleware, para que a resposta de erro
    receba os cabeçalhos de CORS e possa ser lida pelo navegador.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        response_started = False

        async def send_tracking_start(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, receive, send_tracking_start)
        except Exception as exc:
            if response_started:
                raise
            log_unhandled_error(scope["method"], scope["path"], exc)
            response = internal_error_response()
            await response(scope, receive, send)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)
