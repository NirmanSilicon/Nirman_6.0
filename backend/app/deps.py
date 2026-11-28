from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models as m
from .config import Settings, get_settings
from .db import get_db
from .services import otp


def current_user(
    authorization: str | None = Header(None),
    x_device_id: str | None = Header(None, max_length=64),
    db: Session = Depends(get_db),
    s: Settings = Depends(get_settings),
) -> m.User | None:
    """Bearer JWT (phone login) wins; otherwise an anonymous per-device user; otherwise none."""
    if authorization and authorization.lower().startswith("bearer "):
        uid = otp.read_token(authorization[7:], s)
        if uid and (u := db.get(m.User, uid)):
            return u
    if x_device_id:
        u = db.scalars(select(m.User).where(m.User.device_id == x_device_id)).first()
        if not u:
            u = m.User(device_id=x_device_id)
            db.add(u)
            db.commit()
        return u
    return None
