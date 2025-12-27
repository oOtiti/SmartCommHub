from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric
from app.models.base import Base


class HealthRecord(Base):
    __tablename__ = "health_record"

    # 主键
    record_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    # 关联老人ID
    elderly_id = Column(Integer, ForeignKey("elderly.elderly_id"), nullable=False)
    # 监控类型：heart_rate / blood_pressure
    monitor_type = Column(String(32), nullable=False)
    # 数值型监控值，便于聚合与建模
    monitor_value = Column(Numeric(6, 2), nullable=False)
    # 监控时间
    monitor_time = Column(DateTime, nullable=False)
    # 异常标记：0/1，默认0
    is_abnormal = Column(Integer, nullable=False, default=0)
    # 设备ID：模拟设备标识，默认 mock_device_001
    device_id = Column(String(20), nullable=False, default="mock_device_001")
