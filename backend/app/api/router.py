from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.businesses.router import router as businesses_router
from app.modules.cash_register.router import router as cash_register_router
from app.modules.catalog.router import router as catalog_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.orders.router import router as orders_router
from app.modules.payments.router import router as payments_router
from app.modules.stock.router import router as stock_router
from app.modules.users.router import router as users_router

API_V1_PREFIX = "/api/v1"

api_router = APIRouter(prefix=API_V1_PREFIX)
api_router.include_router(auth_router)
api_router.include_router(businesses_router)
api_router.include_router(catalog_router)
api_router.include_router(stock_router)
api_router.include_router(cash_register_router)
# Antes dos pedidos: /orders/pending-payments não pode cair em /orders/{order_id}.
api_router.include_router(payments_router)
api_router.include_router(orders_router)
api_router.include_router(dashboard_router)
api_router.include_router(users_router)
