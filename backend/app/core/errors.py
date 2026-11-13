import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppError

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


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Erro não tratado em %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return error_response(
        HTTPStatus.INTERNAL_SERVER_ERROR,
        "internal_error",
        "Ocorreu um erro interno. Tente novamente.",
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)
