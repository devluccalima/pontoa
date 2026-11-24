import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError
from app.db.scoping import get_for_business
from app.modules.cash_register.models import (
    CashMovement,
    CashMovementKind,
    CashSession,
)
from app.modules.cash_register.schemas import (
    CashMovementCreate,
    CashSessionClose,
    CashSessionOpen,
    CashSessionRead,
    CashSummary,
    difference,
)
from app.modules.orders.models import IN_PROGRESS, Order
from app.modules.payments.models import Payment, PaymentMethod
from app.modules.users.models import User

CASH_CLOSED = "O caixa está fechado. Abra o caixa para continuar."
CASH_ALREADY_OPEN = "Já existe um caixa aberto."


def get_open_session(
    db: Session, business_id: uuid.UUID, *, for_update: bool = False
) -> CashSession | None:
    statement = select(CashSession).where(
        CashSession.business_id == business_id, CashSession.closed_at.is_(None)
    )
    if for_update:
        # Bloqueia o caixa até o fim da transação: operações simultâneas
        # (sangria, fechamento, numeração de pedidos) esperam a vez.
        statement = statement.with_for_update()
    return db.scalar(statement)


def require_open_session(
    db: Session, business_id: uuid.UUID, *, for_update: bool = False
) -> CashSession:
    session = get_open_session(db, business_id, for_update=for_update)
    if session is None:
        raise BusinessRuleError(CASH_CLOSED)
    return session


def get_session(
    db: Session, business_id: uuid.UUID, session_id: uuid.UUID
) -> CashSession:
    return get_for_business(
        db, CashSession, business_id, session_id, "Caixa não encontrado."
    )


def list_sessions(
    db: Session, business_id: uuid.UUID, limit: int = 30
) -> list[CashSession]:
    statement = (
        select(CashSession)
        .where(CashSession.business_id == business_id)
        # O id (UUID v7) desempata registros criados no mesmo instante.
        .order_by(CashSession.opened_at.desc(), CashSession.id.desc())
        .limit(limit)
    )
    return list(db.scalars(statement))


def open_session(db: Session, user: User, data: CashSessionOpen) -> CashSession:
    if get_open_session(db, user.business_id) is not None:
        raise BusinessRuleError(CASH_ALREADY_OPEN)

    session = CashSession(
        business_id=user.business_id,
        opened_by_id=user.id,
        opening_amount=data.opening_amount,
    )
    db.add(session)
    try:
        db.commit()
    except IntegrityError as exc:
        # Duas aberturas simultâneas: o índice único parcial decide.
        db.rollback()
        raise BusinessRuleError(CASH_ALREADY_OPEN) from exc
    return session


def add_movement(db: Session, user: User, data: CashMovementCreate) -> CashMovement:
    session = require_open_session(db, user.business_id, for_update=True)

    if data.kind == CashMovementKind.WITHDRAWAL:
        available = summarize(db, session).expected_amount
        if data.amount > available:
            raise BusinessRuleError(
                f"A sangria é maior que o dinheiro no caixa (R$ {available:.2f})."
            )

    movement = CashMovement(
        business_id=user.business_id,
        cash_session_id=session.id,
        created_by_id=user.id,
        **data.model_dump(),
    )
    db.add(movement)
    db.commit()
    return movement


def list_movements(db: Session, session: CashSession) -> list[CashMovement]:
    statement = (
        select(CashMovement)
        .where(CashMovement.cash_session_id == session.id)
        .order_by(CashMovement.created_at, CashMovement.id)
    )
    return list(db.scalars(statement))


def close_session(db: Session, user: User, data: CashSessionClose) -> CashSession:
    session = require_open_session(db, user.business_id, for_update=True)
    pending = db.scalar(
        select(func.count(Order.id)).where(
            Order.cash_session_id == session.id, Order.status.in_(IN_PROGRESS)
        )
    )
    if pending:
        raise BusinessRuleError(
            f"Há {pending} pedido(s) em andamento. Entregue ou cancele antes de fechar."
        )

    session.expected_amount = summarize(db, session).expected_amount
    session.counted_amount = data.counted_amount
    session.closing_notes = data.notes
    session.closed_by_id = user.id
    session.closed_at = datetime.now(UTC)
    db.commit()
    return session


def summarize(db: Session, session: CashSession) -> CashSummary:
    totals = dict(
        db.execute(
            select(CashMovement.kind, func.coalesce(func.sum(CashMovement.amount), 0))
            .where(CashMovement.cash_session_id == session.id)
            .group_by(CashMovement.kind)
        ).all()
    )
    deposits = Decimal(totals.get(CashMovementKind.DEPOSIT, 0))
    withdrawals = Decimal(totals.get(CashMovementKind.WITHDRAWAL, 0))
    cash_payments = _cash_payments(db, session.id)
    return CashSummary(
        opening_amount=session.opening_amount,
        deposits=deposits,
        withdrawals=withdrawals,
        cash_payments=cash_payments,
        expected_amount=session.opening_amount + deposits - withdrawals + cash_payments,
    )


def _cash_payments(db: Session, cash_session_id: uuid.UUID) -> Decimal:
    """Dinheiro em espécie recebido no caixa, sem estornos e sem o troco."""
    total = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.cash_session_id == cash_session_id,
            Payment.method == PaymentMethod.CASH,
            Payment.voided_at.is_(None),
        )
    )
    return Decimal(total)


def to_read(db: Session, session: CashSession) -> CashSessionRead:
    summary = summarize(db, session)
    expected = (
        summary.expected_amount
        if session.expected_amount is None
        else session.expected_amount
    )
    return CashSessionRead(
        id=session.id,
        is_open=session.is_open,
        opened_by_id=session.opened_by_id,
        opened_at=session.opened_at,
        closed_by_id=session.closed_by_id,
        closed_at=session.closed_at,
        counted_amount=session.counted_amount,
        difference=difference(session.counted_amount, expected),
        closing_notes=session.closing_notes,
        summary=summary,
    )
