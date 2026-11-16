from fastapi import APIRouter

API_V1_PREFIX = "/api/v1"

api_router = APIRouter(prefix=API_V1_PREFIX)

# Os routers dos módulos de negócio serão incluídos aqui, por exemplo:
# api_router.include_router(products.router)
