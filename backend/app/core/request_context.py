import logging
import time
import uuid
from contextvars import ContextVar

from starlette.types import ASGIApp, Message, Receive, Scope, Send

REQUEST_ID_HEADER = "X-Request-ID"
HEALTH_CHECK_PATH = "/health"

_request_id: ContextVar[str | None] = ContextVar("request_id", default=None)

logger = logging.getLogger(__name__)


def _access_log_level(path: str, status_code: int) -> int:
    """Health checks bem-sucedidos vão para DEBUG, para não poluir os logs."""
    if path == HEALTH_CHECK_PATH and status_code < 400:
        return logging.DEBUG
    return logging.INFO


def get_request_id() -> str | None:
    """Retorna o identificador da requisição em andamento, se houver."""
    return _request_id.get()


class RequestContextMiddleware:
    """Gera um ID por requisição, devolve no cabeçalho e registra o acesso."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = uuid.uuid4().hex
        _request_id.set(request_id)
        status_code = 500
        started_at = time.perf_counter()

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode()))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            duration_ms = (time.perf_counter() - started_at) * 1000
            logger.log(
                _access_log_level(scope["path"], status_code),
                "%s %s %d %.1fms",
                scope["method"],
                scope["path"],
                status_code,
                duration_ms,
            )
