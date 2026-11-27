FROM python:3.15-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN useradd --create-home --uid 10001 pontoa

# Dependências primeiro, com versões e hashes fixos (requirements.lock):
# mudar só o código não invalida esta camada do cache.
COPY requirements.lock ./
RUN pip install --require-hashes -r requirements.lock

COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-deps . \
    && pip check \
    && rm -rf build *.egg-info

COPY alembic.ini ./
COPY migrations ./migrations
COPY --chmod=755 start.sh ./

USER pontoa

EXPOSE 8000

CMD ["./start.sh"]
