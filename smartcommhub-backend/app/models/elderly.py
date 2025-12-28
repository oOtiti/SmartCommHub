from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import text
from app.models.base import Base


class Elderly(Base):
    __tablename__ = "elderly"

    elderly_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    # 统一关联到账户的 user_id，一对一
    user_id = Column(Integer, ForeignKey("sys_usr_account.user_id", ondelete="CASCADE"), nullable=False, unique=True)
    name = Column(String(20), nullable=False)
    id_card = Column(String(18), nullable=False, unique=True)
    age = Column(Integer, nullable=False)
    health_level = Column(String(10), nullable=False)
    emergency_contact = Column(String(11), nullable=False)
    address = Column(String(100), nullable=False)
    register_time = Column(DateTime, nullable=False, server_default=text("pg_systimestamp()"))

    __table_args__ = (
        UniqueConstraint("user_id", name="elderly_user_id_key"),
    )
