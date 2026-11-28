# syntax=docker/dockerfile:1
FROM python:3.13-slim AS builder
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_NO_CACHE_DIR=1
WORKDIR /build
COPY requirements.lock ./
RUN python -m pip wheel --wheel-dir /wheels -r requirements.lock
COPY requirements.txt pyproject.toml ./
COPY src ./src
RUN python -m pip wheel --wheel-dir /wheels --no-deps .

FROM python:3.13-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_NO_CACHE_DIR=1 \
    AGENT_X_DATABASE=/app/data/product.sqlite3
WORKDIR /app
COPY --from=builder /wheels /wheels
RUN python -m pip install --no-index --find-links=/wheels agent-x-workspace \
    && rm -rf /wheels \
    && groupadd --gid 10001 agent-x \
    && useradd --uid 10001 --gid agent-x --no-create-home agent-x \
    && mkdir -p /app/data \
    && chown agent-x:agent-x /app/data
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2)"]
CMD ["uvicorn", "agent_x_product.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]

FROM runtime AS test
COPY tests ./tests
COPY scripts ./scripts
COPY contracts ./contracts
CMD ["python", "-m", "unittest", "discover", "-s", "tests", "-v"]
