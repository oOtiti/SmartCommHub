from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.models.base import Base


class HealthRecord(Base):
    __tablename__ = "health_record"

    record_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    elderly_id = Column(Integer, ForeignKey("elderly.elderly_id"), nullable=False)
    monitor_type = Column(String(50), nullable=False)
    monitor_value = Column(String(50), nullable=False)
    monitor_time = Column(DateTime, nullable=False)
    is_abnormal = Column(String(5), nullable=False)
