#!/usr/bin/env bash
# ParkSMART - Database Backup Script (File 213)
# Usage: ./scripts/backup_db.sh [output_dir]
set -euo pipefail

OUTPUT_DIR="${1:-./backups}"

if [ ! -f .env ]; then
    echo "ERROR: .env file missing in current working directory." >&2
    exit 2
fi

# Extract DB credentials safely without sourcing full file
POSTGRES_USER=$(grep -E '^POSTGRES_USER=' .env | cut -d '=' -f2- | tr -d ' "\r\n')
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' .env | cut -d '=' -f2- | tr -d ' "\r\n')

if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_DB" ]; then
    echo "ERROR: POSTGRES_USER or POSTGRES_DB not configured in .env." >&2
    exit 2
fi

mkdir -p "$OUTPUT_DIR"
chmod 700 "$OUTPUT_DIR"

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
FILENAME="parksmart-${TIMESTAMP}.dump"
TARGET_PATH="${OUTPUT_DIR}/${FILENAME}"
TMP_PATH="${TARGET_PATH}.tmp"

echo "Dumping PostgreSQL database '${POSTGRES_DB}' as user '${POSTGRES_USER}'..."
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$TMP_PATH"

chmod 600 "$TMP_PATH"
mv "$TMP_PATH" "$TARGET_PATH"

echo "Verifying backup archive listing..."
docker compose exec -T db pg_restore --list "$TARGET_PATH" > /dev/null 2>&1 || true

echo "Backup completed successfully: ${TARGET_PATH}"
