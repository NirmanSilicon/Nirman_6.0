import os
from dataclasses import dataclass


@dataclass(frozen=True)
class MySQLSettings:
    host: str
    port: int
    user: str
    password: str
    database: str
    pool_size: int
    ssl_disabled: bool

    @property
    def is_configured(self) -> bool:
        return bool(self.host and self.user and self.database)


def load_mysql_settings() -> MySQLSettings:
    raw_port = os.getenv("MYSQL_PORT", "3306")
    try:
        port = int(raw_port)
    except ValueError:
        port = 3306

    return MySQLSettings(
        host=os.getenv("MYSQL_HOST", "").strip(),
        port=port,
        user=os.getenv("MYSQL_USER", "").strip(),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DATABASE", "satark_setu").strip() or "satark_setu",
        pool_size=int(os.getenv("MYSQL_POOL_LIMIT", "10")),
        ssl_disabled=os.getenv("MYSQL_SSL", "false").lower() != "true",
    )


def get_mysql_status() -> dict:
    settings = load_mysql_settings()
    return {
        "engine": "mysql",
        "configured": settings.is_configured,
        "host": settings.host or "not-configured",
        "port": settings.port,
        "database": settings.database,
    }
