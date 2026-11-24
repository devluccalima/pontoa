import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from importlib.metadata import version as package_version

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health
from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.core.errors import UnhandledErrorMiddleware, register_exception_handlers
from app.core.logging_config import configure_logging
from app.core.request_context import REQUEST_ID_HEADER, RequestContextMiddleware
from app.db.session import create_db_engine, create_session_factory

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    """Cria e configura a aplicação FastAPI."""
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    is_production = settings.environment == "production"

    engine = create_db_engine(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        yield
        engine.dispose()

    app = FastAPI(
        title=settings.app_name,
        version=package_version("pontoa-backend"),
        debug=settings.debug,
        docs_url=None if is_production else "/docs",
        redoc_url=None if is_production else "/redoc",
        openapi_url=None if is_production else "/openapi.json",
        lifespan=lifespan,
    )

    app.state.engine = engine
    app.state.session_factory = create_session_factory(engine)

    register_exception_handlers(app)

    app.add_middleware(UnhandledErrorMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
        expose_headers=[REQUEST_ID_HEADER],
    )
    app.add_middleware(RequestContextMiddleware)
    app.include_router(health.router)
    app.include_router(api_router)

    logger.info("Aplicação iniciada (ambiente: %s)", settings.environment)

    return app
