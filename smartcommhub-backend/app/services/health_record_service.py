from typing import Optional, Sequence
from sqlalchemy.orm import Session
from app.dao.health_record_dao import health_record_dao
from app.models.health_record import HealthRecord
from app.utils.audit import audit_log


class HealthRecordService:
    def create(self, db: Session, current_user_id: Optional[int], **data) -> HealthRecord:
        obj = HealthRecord(**data)
        obj = health_record_dao.create(db, obj)
        db.commit()
        audit_log(db, current_user_id, "create", "health_record", getattr(obj, "record_id", None), None)
        return obj

    def list_by_filters(
        self,
        db: Session,
        elderly_id: int,
        monitor_type: Optional[str],
        start_time: Optional[str],
        end_time: Optional[str],
        offset: int,
        limit: int,
    ) -> Sequence[HealthRecord]:
        return health_record_dao.list_by_filters(db, elderly_id, monitor_type, start_time, end_time, offset, limit)

health_record_service = HealthRecordService()
