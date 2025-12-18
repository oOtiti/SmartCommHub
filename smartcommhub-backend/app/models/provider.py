from sqlalchemy import Column, Integer, String, UniqueConstraint
from app.models.base import Base


class Provider(Base):
    __tablename__ = "provider"

    provider_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), nullable=False)
    service_type = Column(String(50), nullable=False)
    service_nature = Column(String(50), nullable=False)
    qualification_id = Column(String(50), nullable=False)
    contact = Column(String(50), nullable=False)
    audit_status = Column(String(10), nullable=False)
    belong_community = Column(String(50), nullable=False)

    __table_args__ = (
        UniqueConstraint("qualification_id", name="provider_qualification_id_key"),
    )
