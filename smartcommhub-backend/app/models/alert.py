from sqlalchemy import Column, Integer, BigInteger, String, Numeric, TIMESTAMP, ForeignKey
from app.models.base import Base


class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    elderly_id = Column(BigInteger, ForeignKey("elderly.elderly_id", ondelete="CASCADE"), nullable=False, index=True)
    monitor_type = Column(String(32), nullable=False)
    monitor_value = Column(Numeric(6, 2), nullable=False)
    monitor_time = Column(TIMESTAMP, nullable=False)
    device_id = Column(String(50), nullable=False, default="mock_device_001")

    global_abnormal = Column(Integer, nullable=False, default=0)
    personal_abnormal = Column(Integer, nullable=False, default=0)
    score = Column(Numeric(6, 3), nullable=True)
    confidence = Column(Numeric(6, 3), nullable=True)
    k = Column(Numeric(6, 3), nullable=True)
    n = Column(BigInteger, nullable=True)
    mu = Column(Numeric(8, 3), nullable=True)
    sigma = Column(Numeric(8, 3), nullable=True)

    ack_status = Column(String(16), nullable=False, default="UNACKED")
    ack_time = Column(TIMESTAMP, nullable=True)
    silence_until = Column(TIMESTAMP, nullable=True)

    created_at = Column(TIMESTAMP, nullable=False)
    updated_at = Column(TIMESTAMP, nullable=False)
