from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError
from app.modules.businesses.models import Business
from app.modules.dashboard.schemas import DashboardRead, ReceivedByMethod, TopProduct
from app.modules.orders.models import Order, OrderItem, OrderStatus
from app.modules.payments.models import Payment, PaymentMethod

MAX_PERIOD_DAYS = 366
TOP_PRODUCTS_LIMIT = 5
CENT = Decimal("0.01")


def today_in(business: Business) -> date:
    return datetime.now(ZoneInfo(business.timezone)).date()


def period_bounds(
    business: Business, start: date, end: date
) -> tuple[datetime, datetime]:
    """Converte dias do estabelecimento em instantes: [início, fim)."""
    if end < start:
        raise BusinessRuleError("A data final é anterior à inicial.")
    if (end - start).days + 1 > MAX_PERIOD_DAYS:
        raise BusinessRuleError(f"O período máximo é de {MAX_PERIOD_DAYS} dias.")
    zone = ZoneInfo(business.timezone)
    return (
        datetime.combine(start, time.min, zone),
        datetime.combine(end + timedelta(days=1), time.min, zone),
    )


def build_dashboard(
    db: Session, business: Business, start: date, end: date
) -> DashboardRead:
    since, until = period_bounds(business, start, end)
    in_period = (
        Order.business_id == business.id,
        Order.created_at >= since,
        Order.created_at < until,
    )
    valid = (*in_period, Order.status != OrderStatus.CANCELLED)

    sales_total, orders_count, receivable = db.execute(
        select(
            func.coalesce(func.sum(Order.total), 0),
            func.count(Order.id),
            func.coalesce(func.sum(Order.total - Order.paid_amount), 0),
        ).where(*valid)
    ).one()
    cancelled_count = db.scalar(
        select(func.count(Order.id)).where(
            *in_period, Order.status == OrderStatus.CANCELLED
        )
    )

    received = dict(
        db.execute(
            select(Payment.method, func.sum(Payment.amount))
            .where(
                Payment.business_id == business.id,
                Payment.voided_at.is_(None),
                Payment.created_at >= since,
                Payment.created_at < until,
            )
            .group_by(Payment.method)
        ).all()
    )

    top = db.execute(
        select(
            OrderItem.product_id,
            func.max(OrderItem.product_name),
            func.sum(OrderItem.quantity),
            func.sum(OrderItem.line_total),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(*valid)
        .group_by(OrderItem.product_id)
        .order_by(func.sum(OrderItem.quantity).desc(), func.max(OrderItem.product_name))
        .limit(TOP_PRODUCTS_LIMIT)
    ).all()

    sales_total = Decimal(sales_total)
    average_ticket = (
        (sales_total / orders_count).quantize(CENT, ROUND_HALF_UP)
        if orders_count
        else Decimal("0")
    )
    return DashboardRead(
        start=start,
        end=end,
        timezone=business.timezone,
        sales_total=sales_total,
        orders_count=orders_count,
        cancelled_count=cancelled_count or 0,
        average_ticket=average_ticket,
        received_total=sum(received.values(), Decimal("0")),
        received_by_method=[
            ReceivedByMethod(method=method, amount=received.get(method, Decimal("0")))
            for method in PaymentMethod
        ],
        receivable_total=Decimal(receivable),
        top_products=[
            TopProduct(product_id=product_id, name=name, quantity=qty, revenue=revenue)
            for product_id, name, qty, revenue in top
        ],
    )
