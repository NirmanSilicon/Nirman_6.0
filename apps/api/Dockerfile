FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn[standard] pydantic networkx numpy ortools python-dotenv websockets httpx

COPY pyproject.toml README.md ./
COPY packages ./packages
COPY fixtures ./fixtures
COPY schemas ./schemas
COPY apps/api ./apps/api

ENV PYTHONPATH="/app"

EXPOSE 8000

CMD ["uvicorn", "apps.api.aftershock_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
