from datetime import date

from fastapi import APIRouter

from app.api.dependencies import DbSession
from app.modules.auth.dependencies import OwnerUser
from app.modules.dashboard import service
from app.modules.dashboard.schemas import DashboardRead

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", summary="Indicadores de vendas e recebimentos do período")
def get_dashboard(
    db: DbSession,
    owner: OwnerUser,
    start: date | None = None,
    end: date | None = None,
) -> DashboardRead:
    """Datas ausentes valem hoje, no fuso do estabelecimento.

    Vendas, pedidos, ticket médio, a receber e mais vendidos consideram os
    pedidos criados no período, exceto os cancelados (RN-006). Recebido
    considera os pagamentos registrados no período, exceto os estornados.
    """
    business = owner.business
    today = service.today_in(business)
    return service.build_dashboard(db, business, start or today, end or today)
