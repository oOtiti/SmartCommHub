from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import text
from app.models.base import Base


class ServiceOrder(Base):
    __tablename__ = "service_order"

    order_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    elderly_id = Column(Integer, ForeignKey("elderly.elderly_id"), nullable=False)
    service_id = Column(Integer, ForeignKey("service_item.service_id"), nullable=False)
    reserve_time = Column(DateTime, nullable=False)
    service_time = Column(DateTime, nullable=False)
    order_status = Column(String(30), nullable=False)
    pay_status = Column(String(50), nullable=False)
    eval_score = Column(Integer, nullable=True, server_default=text("0"))
    eval_content = Column(Text, nullable=True)
    eval_time = Column(DateTime, nullable=True)
