from http import HTTPStatus


class AppError(Exception):
    """Erro esperado da aplicação, com resposta HTTP previsível."""

    status_code: HTTPStatus = HTTPStatus.BAD_REQUEST
    code: str = "app_error"
    message: str = "Não foi possível processar a solicitação."
    headers: dict[str, str] | None = None

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.message
        super().__init__(self.message)


class UnauthorizedError(AppError):
    status_code = HTTPStatus.UNAUTHORIZED
    code = "unauthorized"
    message = "Autenticação necessária."
    headers = {"WWW-Authenticate": "Bearer"}


class ForbiddenError(AppError):
    status_code = HTTPStatus.FORBIDDEN
    code = "forbidden"
    message = "Você não tem permissão para esta operação."


class NotFoundError(AppError):
    status_code = HTTPStatus.NOT_FOUND
    code = "not_found"
    message = "Recurso não encontrado."


class BusinessRuleError(AppError):
    status_code = HTTPStatus.CONFLICT
    code = "business_rule_violation"
    message = "A operação não é permitida no estado atual."


class ServiceUnavailableError(AppError):
    status_code = HTTPStatus.SERVICE_UNAVAILABLE
    code = "service_unavailable"
    message = "Serviço temporariamente indisponível."
