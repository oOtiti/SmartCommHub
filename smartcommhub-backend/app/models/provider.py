from sqlalchemy import Column, Integer, String, UniqueConstraint, ForeignKey
from app.models.base import Base


class Provider(Base):
    __tablename__ = "provider"

    provider_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    # 统一关联到账户的 user_id，一对一
    user_id = Column(Integer, ForeignKey("sys_usr_account.user_id", ondelete="CASCADE"), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    service_type = Column(String(50), nullable=False)
    service_nature = Column(String(50), nullable=False)
    qualification_id = Column(String(50), nullable=False)
    contact = Column(String(50), nullable=False)
    audit_status = Column(String(10), nullable=False)
    belong_community = Column(String(50), nullable=False)

    __table_args__ = (
        UniqueConstraint("qualification_id", name="provider_qualification_id_key"),
        UniqueConstraint("user_id", name="provider_user_id_key"),
    )
