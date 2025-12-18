from typing import Sequence, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.health_record import HealthRecord
from app.dao.base_dao import BaseDAO


class HealthRecordDAO(BaseDAO[HealthRecord]):
    def __init__(self):
        super().__init__(HealthRecord)

    def list_by_filters(
        self,
        db: Session,
        elderly_id: int,
        monitor_type: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> Sequence[HealthRecord]:
        stmt = select(HealthRecord).where(HealthRecord.elderly_id == elderly_id)
        if monitor_type:
            stmt = stmt.where(HealthRecord.monitor_type == monitor_type)
        if start_time:
            stmt = stmt.where(HealthRecord.monitor_time >= start_time)
        if end_time:
            stmt = stmt.where(HealthRecord.monitor_time <= end_time)
        stmt = stmt.offset(offset).limit(limit)
        return db.execute(stmt).scalars().all()

health_record_dao = HealthRecordDAO()
