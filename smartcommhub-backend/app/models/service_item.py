from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from app.models.base import Base


class ServiceItem(Base):
    __tablename__ = "service_item"

    service_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    provider_id = Column(Integer, ForeignKey("provider.provider_id"), nullable=False)
    name = Column(String(100), nullable=False)
    content = Column(String(500), nullable=False)
    duration = Column(String(20), nullable=False)
    price = Column(Numeric(8, 2), nullable=False)
    service_scope = Column(String(200), nullable=False)
    status = Column(String(30), nullable=False)
