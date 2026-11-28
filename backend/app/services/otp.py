"""Phone OTP (F14, P2). SMS delivery is a pluggable hook: replace `send_sms`
with MSG91/Twilio/etc. In APP_ENV=dev the code is also echoed in the API response."""
import hashlib
import logging
import secrets
from datetime import timedelta

import jwt
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models as m
from ..config import Settings

log = logging.getLogger("otp")


def send_sms(phone: str, text: str) -> None:  # integration point
    log.warning("SMS to %s: %s", phone, text)


def _hash(code: str, s: Settings) -> str:
    return hashlib.sha256(f"{s.jwt_secret}:{code}".encode()).hexdigest()


def request_code(db: Session, phone: str, s: Settings) -> str:
    since = m.now() - timedelta(hours=1)
    n = db.scalar(select(func.count()).select_from(m.OtpCode).where(m.OtpCode.phone == phone, m.OtpCode.created_at > since))
    if n >= s.otp_max_per_hour:
        raise HTTPException(429, "Too many OTP requests; try later")
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(m.OtpCode(phone=phone, code_hash=_hash(code, s), expires_at=m.now() + timedelta(seconds=s.otp_ttl_s)))
    db.commit()
    send_sms(phone, f"Your Ouroboros code is {code}")
    return code


def verify_code(db: Session, phone: str, code: str, s: Settings) -> None:
    row = db.scalars(select(m.OtpCode).where(m.OtpCode.phone == phone, m.OtpCode.used.is_(False))
                     .order_by(m.OtpCode.created_at.desc()).limit(1)).first()
    if not row or row.expires_at < m.now() or row.attempts >= 5:
        raise HTTPException(400, "Code expired or invalid")
    row.attempts += 1
    if not secrets.compare_digest(row.code_hash, _hash(code, s)):
        db.commit()
        raise HTTPException(400, "Code expired or invalid")
    row.used = True
    db.commit()


def make_token(user_id: str, s: Settings) -> str:
    exp = m.now() + timedelta(hours=s.jwt_ttl_hours)
    return jwt.encode({"sub": user_id, "exp": exp}, s.jwt_secret, algorithm="HS256")


def read_token(token: str, s: Settings) -> str | None:
    try:
        return jwt.decode(token, s.jwt_secret, algorithms=["HS256"])["sub"]
    except jwt.PyJWTError:
        return None
