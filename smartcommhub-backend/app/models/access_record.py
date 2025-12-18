from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.models.base import Base


class AccessRecord(Base):
    __tablename__ = "access_record"

    access_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    elderly_id = Column(Integer, ForeignKey("elderly.elderly_id"), nullable=False)
    access_type = Column(String(4), nullable=False)
    record_time = Column(DateTime, nullable=False)
    gate_location = Column(String(50), nullable=False)
    is_abnormal = Column(String(4), nullable=False)
