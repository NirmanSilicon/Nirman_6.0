FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
COPY requirements.lock.txt pyproject.toml ./
COPY src ./src
RUN pip install --no-cache-dir -r requirements.lock.txt && pip install --no-cache-dir --no-deps . && useradd --uid 10001 --create-home uqual && mkdir /vault && chown uqual /vault
USER uqual
EXPOSE 8000
CMD ["uvicorn", "uqual.api:app", "--host", "0.0.0.0", "--port", "8000"]
