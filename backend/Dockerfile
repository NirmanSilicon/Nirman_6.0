FROM python:3.12-slim
WORKDIR /srv

# Install runtime OS dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Layer-cached dependency installation
COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY app/ ./app/
COPY alembic.ini .

# Create unprivileged application user
RUN useradd -u 10001 -m app
USER app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
