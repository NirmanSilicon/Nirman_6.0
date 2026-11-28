"""Clerk authentication verification for the backend."""

import os
import jwt
from functools import lru_cache
from typing import Optional, Dict, Any
from datetime import datetime, UTC

from app.core.config import settings
from app.core.errors import AuthenticationError

# Clerk JWKS URL for token verification
CLERK_JWKS_URL = f"https://{settings.clerk_jwks_domain}/.well-known/jwks.json" if hasattr(settings, 'clerk_jwks_domain') else "https://api.clerk.com/v1/jwks"


@lru_cache(maxsize=1)
def get_jwks() -> Dict[str, Any]:
    """Fetch and cache Clerk JWKS."""
    import urllib.request
    import json
    
    try:
        with urllib.request.urlopen(CLERK_JWKS_URL) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        # Fallback for development - in production this should raise
        return {"keys": []}


def verify_clerk_token(token: str) -> Dict[str, Any]:
    """
    Verify a Clerk JWT token and return the payload.
    
    In production, this verifies against Clerk's JWKS.
    In development with DISABLE_AUTH=true, it returns a mock payload.
    """
    # Development bypass
    if settings.disable_auth:
        return {
            "sub": "00000000-0000-0000-0000-000000000001",
            "org": "00000000-0000-0000-0000-000000000001",
            "role": "platform_admin",
            "email": "dev@roadguard.local",
            "exp": int((datetime.now(UTC).timestamp()) + 3600),
        }
    
    # Get the key ID from token header
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as e:
        raise AuthenticationError("Invalid token format.") from e
    
    kid = header.get("kid")
    if not kid:
        raise AuthenticationError("Token missing key ID.")
    
    # Find the matching key
    jwks = get_jwks()
    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    
    if not key:
        raise AuthenticationError("Unable to find matching key.")
    
    # Convert JWK to PEM format
    from jwt.algorithms import RSAAlgorithm
    public_key = RSAAlgorithm.from_jwk(key)
    
    # Verify and decode the token
    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=settings.clerk_audience if hasattr(settings, 'clerk_audience') else None,
            issuer=f"https://{settings.clerk_issuer_domain}" if hasattr(settings, 'clerk_issuer_domain') else None,
        )
        return payload
    except jwt.ExpiredSignatureError as e:
        raise AuthenticationError("Token has expired. Please sign in again.") from e
    except jwt.InvalidTokenError as e:
        raise AuthenticationError("The supplied credential is not valid.") from e


def get_clerk_user_id(token: str) -> str:
    """Extract user ID from Clerk token."""
    payload = verify_clerk_token(token)
    return str(payload.get("sub", ""))


def get_clerk_org_id(token: str) -> str:
    """Extract organization ID from Clerk token."""
    payload = verify_clerk_token(token)
    return str(payload.get("org", ""))