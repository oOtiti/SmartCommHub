from sqlalchemy import Column, BigInteger, String, Boolean, Integer, DateTime
from sqlalchemy.sql import func
from app.models.base import Base

class User(Base):
    __tablename__ = "sys_usr_account"

    user_id = Column(BigInteger, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    phone = Column(String(30), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    # 建议：0=管理员, 1=老人, 2=家属, 3=服务商（如与库中实际不一致，请按库值调整）
    user_type = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    failed_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    pwd_changed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    # 统一关联：取消冗余的实体ID字段，使用各实体表上的 user_id 进行一对一映射
