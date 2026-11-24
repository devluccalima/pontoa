from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.businesses.router import router as businesses_router
from app.modules.catalog.router import router as catalog_router
from app.modules.users.router import router as users_router

API_V1_PREFIX = "/api/v1"

api_router = APIRouter(prefix=API_V1_PREFIX)
api_router.include_router(auth_router)
api_router.include_router(businesses_router)
api_router.include_router(catalog_router)
api_router.include_router(users_router)
