import logging
import logging.config

from app.core.request_context import get_request_id

UVICORN_SERVER_ERROR_MESSAGE = "Exception in ASGI application"


class RequestIdFilter(logging.Filter):
    """Anexa o ID da requisição em andamento a cada registro de log."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id() or "-"
        return True


class DropDuplicateServerErrorFilter(logging.Filter):
    """Descarta o log de exceção do Uvicorn, já registrado pela aplicação."""

    def filter(self, record: logging.LogRecord) -> bool:
        return not record.getMessage().startswith(UVICORN_SERVER_ERROR_MESSAGE)


def configure_logging(level: str) -> None:
    """Configura os logs da aplicação e ajusta os loggers do Uvicorn."""
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "filters": {
                "request_id": {"()": RequestIdFilter},
                "drop_duplicate_server_error": {
                    "()": DropDuplicateServerErrorFilter,
                },
            },
            "formatters": {
                "default": {
                    "format": (
                        "%(asctime)s %(levelname)-8s [%(request_id)s] "
                        "%(name)s: %(message)s"
                    ),
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "filters": ["request_id"],
                },
            },
            "loggers": {
                "app": {
                    "level": level,
                    "handlers": ["console"],
                    "propagate": False,
                },
                "uvicorn.error": {
                    "filters": ["drop_duplicate_server_error"],
                },
                "uvicorn.access": {
                    "handlers": [],
                    "propagate": False,
                },
            },
        }
    )
