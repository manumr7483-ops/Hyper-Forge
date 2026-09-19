import os
import time
import jwt
import hashlib
from typing import Optional
from fastapi import HTTPException, Header, Query, Depends

JWT_SECRET = os.getenv("JWT_SECRET", "hyperforge_super_secret_jwt_key_2026")
JWT_ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    # Use sha256 with salt for universal zero-dependency compatibility
    salt = "hyperforge_salt_"
    return hashlib.sha256((salt + password).encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(user_id: str, email: str, expires_delta_seconds: int = 604800) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + expires_delta_seconds,
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_file_token(kind: str, filename: str, expires_delta_seconds: int = 86400) -> str:
    now = int(time.time())
    payload = {
        "kind": kind,
        "file": filename,
        "iat": now,
        "exp": now + expires_delta_seconds,
        "type": "file"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_file_token(kind: str, filename: str, token: str) -> bool:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "file":
            return False
        if payload.get("kind") != kind or payload.get("file") != filename:
            return False
        return True
    except Exception:
        return False

async def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization:
        return None
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        return None

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid token header")
        payload = jwt.decode(parts[1], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
