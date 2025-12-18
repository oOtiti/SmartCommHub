from passlib.context import CryptContext
from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import jwt

# bcrypt 自动为每个密码生成随机盐
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# Fernet 加密
def _get_fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY.encode()
    # 校验 URL-safe base64 格式
    base64.urlsafe_b64decode(key)
    return Fernet(key)

def encrypt_sensitive_data(data: str) -> str:
    f = _get_fernet()
    return f.encrypt(data.encode()).decode()

def decrypt_sensitive_data(encry_data: str) -> str:
    f = _get_fernet()
    try:
        return f.decrypt(encry_data.encode()).decode()
    except InvalidToken:
        return ""


# JWT
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload["exp"] = expire
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: Dict[str, Any]) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    payload.update({"exp": expire, "type": "refresh"})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def validate_security_config() -> None:
    # 在应用启动时校验密钥格式
    _ = _get_fernet()