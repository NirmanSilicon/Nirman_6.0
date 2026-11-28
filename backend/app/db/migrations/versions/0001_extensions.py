"""Install required PostgreSQL extensions: postgis, btree_gist, citext (File 34).

Revision ID: 0001
Revises: None
Create Date: 2026-11-25 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")


def downgrade() -> None:
    # Deliberate no-op: dropping extensions in downgrade would destroy dependent objects
    pass
