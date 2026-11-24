"""Comandos administrativos.

Uso (na pasta backend, com o venv ativo):

    python -m app.cli create-business --name "Arepas da Feira" \\
        --owner-name "Lucca" --owner-email lucca@example.com

A senha do dono é pedida no terminal, sem aparecer na tela.
"""

import argparse
import getpass
import sys
from collections.abc import Callable, Sequence

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.db.session import create_db_engine, create_session_factory
from app.modules.businesses.models import DEFAULT_TIMEZONE, Business
from app.modules.businesses.schemas import validate_timezone
from app.modules.users.models import UserRole
from app.modules.users.schemas import UserCreate
from app.modules.users.service import create_user

PasswordPrompt = Callable[[str], str]


def create_business(
    db: Session,
    *,
    name: str,
    timezone: str,
    owner_name: str,
    owner_email: str,
    owner_password: str,
) -> Business:
    """Cria o estabelecimento e o primeiro dono numa única transação."""
    owner = UserCreate(
        name=owner_name,
        email=owner_email,
        password=owner_password,
        role=UserRole.OWNER,
    )
    business = Business(name=name, timezone=validate_timezone(timezone))
    db.add(business)
    db.flush()
    create_user(db, business.id, owner)
    return business


def ask_password(prompt: PasswordPrompt) -> str:
    password = prompt("Senha do dono: ")
    if password != prompt("Repita a senha: "):
        raise SystemExit("As senhas não conferem.")
    return password


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)

    create = commands.add_parser(
        "create-business", help="Cria um estabelecimento e o primeiro dono"
    )
    create.add_argument("--name", required=True, help="Nome do estabelecimento")
    create.add_argument("--timezone", default=DEFAULT_TIMEZONE)
    create.add_argument("--owner-name", required=True)
    create.add_argument("--owner-email", required=True)
    return parser


def main(
    argv: Sequence[str] | None = None,
    password_prompt: PasswordPrompt = getpass.getpass,
) -> int:
    args = build_parser().parse_args(argv)
    password = ask_password(password_prompt)

    engine = create_db_engine(get_settings())
    try:
        with create_session_factory(engine)() as db:
            business = create_business(
                db,
                name=args.name,
                timezone=args.timezone,
                owner_name=args.owner_name,
                owner_email=args.owner_email,
                owner_password=password,
            )
    except (AppError, ValidationError, ValueError) as exc:
        print(f"Erro: {_describe(exc)}", file=sys.stderr)
        return 1
    finally:
        engine.dispose()

    print(f"Estabelecimento criado: {business.name} ({business.id})")
    return 0


def _describe(exc: Exception) -> str:
    if isinstance(exc, ValidationError):
        return "; ".join(
            f"{'.'.join(map(str, error['loc']))}: {error['msg']}"
            for error in exc.errors()
        )
    return str(exc)


if __name__ == "__main__":
    raise SystemExit(main())
