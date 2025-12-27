"""
SQLAlchemy 模型映射（与 SQL 1:1），供数据导入与校验使用。
说明：
- 敏感列通过 Column.info 标注 encrypt=True（ORM 层透明）。
- 与 scripts/sql/01_schema_v1.sql 保持字段名称一致。
- 仅提供核心字段，业务函数留空位后续补充。
"""
from __future__ import annotations
from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, Numeric, Boolean,
    SmallInteger, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()

# 公共时间戳列
created_at_col = Column("created_at", DateTime, nullable=False, server_default=func.now())
updated_at_col = Column("updated_at", DateTime, nullable=False, server_default=func.now())

class Elderly(Base):
    __tablename__ = "elderly"
    elderly_id = Column(BigInteger, primary_key=True)
    name = Column(String(20), nullable=False)
    id_card = Column(String(18), nullable=False, unique=True, info={"encrypt": True})
    age = Column(SmallInteger, nullable=False)
    health_level = Column(String(10), nullable=False)
    emergency_contact = Column(String(11), nullable=False, info={"encrypt": True})
    address = Column(String(100), nullable=False, info={"encrypt": True})
    register_time = Column(DateTime, nullable=False, server_default=func.now())
    created_at = created_at_col
    updated_at = updated_at_col

class FamilyMember(Base):
    __tablename__ = "family_member"
    family_id = Column(BigInteger, primary_key=True)
    name = Column(String(20), nullable=False)
    phone = Column(String(30), nullable=False, info={"encrypt": True})
    relation = Column(String(50), nullable=False)
    permission_level = Column(String(30), nullable=False)
    elderly_id = Column(Integer, ForeignKey("elderly.elderly_id", ondelete="CASCADE"), nullable=False)
    created_at = created_at_col
    updated_at = updated_at_col

class Provider(Base):
    __tablename__ = "provider"
    provider_id = Column(BigInteger, primary_key=True)
    name = Column(String(100), nullable=False)
    service_type = Column(String(50), nullable=False)
    service_nature = Column(String(50), nullable=False)
    qualification_id = Column(String(50), nullable=False, unique=True, info={"encrypt": True})
    contact = Column(String(50), nullable=False, info={"encrypt": True})
    audit_status = Column(String(10), nullable=False)
    belong_community = Column(String(50), nullable=False)
    created_at = created_at_col
    updated_at = updated_at_col

class ServiceItem(Base):
    __tablename__ = "service_item"
    service_id = Column(BigInteger, primary_key=True)
    provider_id = Column(Integer, ForeignKey("provider.provider_id"), nullable=False)
    name = Column(String(100), nullable=False)
    content = Column(String(500), nullable=False)
    duration = Column(String(20), nullable=False)
    price = Column(Numeric(8, 2), nullable=False)
    service_scope = Column(String(200), nullable=False)
    status = Column(String(30), nullable=False)
    created_at = created_at_col
    updated_at = updated_at_col

class ServiceOrder(Base):
    __tablename__ = "service_order"
    order_id = Column(BigInteger, primary_key=True)
    elderly_id = Column(Integer, ForeignKey("elderly.elderly_id"), nullable=False)
    service_id = Column(Integer, ForeignKey("service_item.service_id"), nullable=False)
    reserve_time = Column(DateTime, nullable=False)
    service_time = Column(DateTime, nullable=False)
    order_status = Column(String(30), nullable=False)
    pay_status = Column(String(50), nullable=False)
    eval_score = Column(Numeric(3, 1), nullable=True)
    eval_content = Column(Text, nullable=True, info={"encrypt": True})
    eval_time = Column(DateTime, nullable=True)
    created_at = created_at_col
    updated_at = updated_at_col

class HealthRecord(Base):
    __tablename__ = "health_record"
    record_id = Column(BigInteger, primary_key=True)
    elderly_id = Column(Integer, ForeignKey("elderly.elderly_id"), nullable=False)
    monitor_type = Column(String(32), nullable=False)
    monitor_value = Column(Numeric(6, 2), nullable=False)
    monitor_time = Column(DateTime, nullable=False)
    is_abnormal = Column(Integer, nullable=False, default=0)
    device_id = Column(String(20), nullable=False, default="mock_device_001")
    created_at = created_at_col
    updated_at = updated_at_col

class CommunityNotice(Base):
    __tablename__ = "community_notice"
    notice_id = Column(BigInteger, primary_key=True)
    community_id = Column(String(20), nullable=False)
    title = Column(String(100), nullable=False)
    content = Column(String(1000), nullable=False, info={"encrypt": True})
    publish_time = Column(DateTime, nullable=False)
    target_group = Column(String(50), nullable=False)
    created_at = created_at_col
    updated_at = updated_at_col

class SysUserAccount(Base):
    __tablename__ = "sys_usr_account"
    user_id = Column(BigInteger, primary_key=True)
    username = Column(String(50), nullable=False, unique=True)
    phone = Column(String(30), nullable=True, unique=True, info={"encrypt": True})
    password_hash = Column(String(255), nullable=False)
    user_type = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, nullable=False, default=True)
    failed_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    pwd_changed_at = Column(DateTime, nullable=True)
    created_at = created_at_col
    updated_at = updated_at_col
    elderly_id = Column(BigInteger, ForeignKey("elderly.elderly_id", ondelete="SET NULL"), nullable=True)
    family_id = Column(BigInteger, ForeignKey("family_member.family_id", ondelete="SET NULL"), nullable=True)
    provider_id = Column(BigInteger, ForeignKey("provider.provider_id", ondelete="SET NULL"), nullable=True)

class AccessRecord(Base):
    __tablename__ = "access_record"
    access_id = Column(BigInteger, primary_key=True)
    elderly_id = Column(Integer, ForeignKey("elderly.elderly_id"), nullable=False)
    access_type = Column(String(4), nullable=False)
    record_time = Column(DateTime, nullable=False)
    gate_location = Column(String(50), nullable=False)
    is_abnormal = Column(String(4), nullable=False)
    created_at = created_at_col
    updated_at = updated_at_col

class ServiceTypeDict(Base):
    __tablename__ = "service_type_dict"
    type_code = Column(String(50), primary_key=True)
    type_name = Column(String(100), nullable=False)
    created_at = created_at_col
    updated_at = updated_at_col

class CommunityDict(Base):
    __tablename__ = "community_dict"
    community_id = Column(String(20), primary_key=True)
    community_name = Column(String(100), nullable=False)
    created_at = created_at_col
    updated_at = updated_at_col
