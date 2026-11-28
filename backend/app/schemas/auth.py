"""ParkSMART - Authentication and User Schemas (File 43)."""

from __future__ import annotations

import uuid
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.core.rbac import Role, parse_role
from app.schemas.common import UtcDateTime


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(..., min_length=10, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=120)
    role: Role = Field(default=Role.DRIVER)
    business_name: str | None = Field(default=None, max_length=150)

    @field_validator("email", mode="before")
    @classmethod
    def lower_email(cls, v: str) -> str:
        return v.lower().strip() if isinstance(v, str) else v

    @field_validator("full_name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("full_name must not be empty or whitespace only")
        return s

    @field_validator("role", mode="before")
    @classmethod
    def validate_role(cls, v: Any) -> Role:
        return parse_role(v)

    @model_validator(mode="after")
    def validate_business_fields(self) -> RegisterRequest:
        if self.role == Role.BUSINESS_OPERATOR and not self.business_name:
            raise ValueError("business_name required for business_operator")
        if self.role != Role.BUSINESS_OPERATOR and self.business_name is not None:
            raise ValueError("business_name not allowed for this role")
        return self


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str

    @field_validator("email", mode="before")
    @classmethod
    def lower_email(cls, v: str) -> str:
        return v.lower().strip() if isinstance(v, str) else v


class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: str = Field(..., min_length=1)


class LogoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: str = Field(..., min_length=1)


class TokenPair(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    phone: str | None = None
    status: str
    roles: list[Role]
    created_at: UtcDateTime


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=20)


class PasswordChange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str
    new_password: str = Field(..., min_length=10, max_length=128)


class PasswordResetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def lower_email(cls, v: str) -> str:
        return v.lower().strip() if isinstance(v, str) else v


class PasswordResetConfirm(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str
    new_password: str = Field(..., min_length=10, max_length=128)
