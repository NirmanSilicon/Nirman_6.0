from datetime import datetime, timedelta, timezone
import os
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from pwdlib import PasswordHash

from app.database import SessionLocal
from app.models import UserActivityRecord, UserRecord

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "cyberguard-msme-dev-secret-change-in-prod-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))

password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(plain_password: str) -> str:
    return password_hasher.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hasher.verify(plain_password, hashed_password)


def create_access_token(user: UserRecord) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please log in again.",
        ) from exc


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[UserRecord]:
    """Return the signed-in UserRecord when a Bearer token is supplied, or None for guest requests."""
    if not credentials or not credentials.credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        return None
    with SessionLocal() as db:
        return db.get(UserRecord, int(user_id))


def get_current_user(
    user: Optional[UserRecord] = Depends(get_optional_current_user),
) -> UserRecord:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in first.",
        )
    return user


def log_user_activity(
    user_id: Optional[int],
    action_type: str,
    target: str,
    verdict_or_grade: str,
    score: Optional[int] = None,
    detail: str = "",
) -> None:
    """Persist a tracked action for an authenticated user without blocking guest flows."""
    if user_id is None:
        return
    with SessionLocal() as db:
        db.add(
            UserActivityRecord(
                user_id=user_id,
                action_type=action_type,
                target=target[:512],
                verdict_or_grade=verdict_or_grade[:40],
                score=score,
                detail=detail,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()


def seed_demo_users() -> None:
    """Idempotently seed one Citizen and one Enterprise demo account for instant stage sign-in."""
    demo_accounts = [
        ("citizen@cyberguard.in", "Aarav (Citizen Demo)", "Citizen@2026", "citizen"),
        ("owner@sharmabakery.in", "Rajesh Sharma (Enterprise Owner)", "Enterprise@2026", "enterprise"),
    ]
    with SessionLocal() as db:
        for email, full_name, plain_pw, role in demo_accounts:
            exists = db.query(UserRecord).filter(UserRecord.email == email).first()
            if not exists:
                db.add(
                    UserRecord(
                        email=email,
                        full_name=full_name,
                        password_hash=hash_password(plain_pw),
                        role=role,
                        created_at=datetime.now(timezone.utc),
                    )
                )
        db.commit()