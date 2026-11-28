from datetime import datetime, timezone
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ScanRecord(Base):
    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    domain: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    normalized_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    resolved_ip: Mapped[str] = mapped_column(String(64), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    grade: Mapped[str] = mapped_column(String(4), nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    module_summary: Mapped[dict] = mapped_column(JSON, nullable=False)
    patch_bundle: Mapped[dict] = mapped_column(JSON, nullable=False)

    findings: Mapped[list["FindingRecord"]] = relationship(
        back_populates="scan",
        cascade="all, delete-orphan",
        order_by="FindingRecord.id",
    )


class FindingRecord(Base):
    __tablename__ = "findings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    scan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scans.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    module: Mapped[str] = mapped_column(String(32), nullable=False)
    code: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    cwe_id: Mapped[str] = mapped_column(String(32), nullable=False)
    owasp_category: Mapped[str] = mapped_column(String(128), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    technical_detail: Mapped[str] = mapped_column(Text, nullable=False)
    business_impact: Mapped[str] = mapped_column(Text, nullable=False)
    remediation: Mapped[dict] = mapped_column(JSON, nullable=False)

    scan: Mapped["ScanRecord"] = relationship(back_populates="findings")
class UserRecord(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(120), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="citizen")  # "citizen" | "enterprise"
    created_at = Column(DateTime(timezone=True), nullable=False)


class UserActivityRecord(Base):
    __tablename__ = "user_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    action_type = Column(String(40), nullable=False)  # LINK_CHECK | ENTERPRISE_SCAN | REMOTE_PATCH | REMOTE_ROLLBACK
    target = Column(String(512), nullable=False)
    verdict_or_grade = Column(String(40), nullable=False)
    score = Column(Integer, nullable=True)
    detail = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), nullable=False)