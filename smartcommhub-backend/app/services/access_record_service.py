from typing import Optional, Sequence
from sqlalchemy.orm import Session
from app.dao.access_record_dao import access_record_dao
from app.models.access_record import AccessRecord
from app.utils.audit import audit_log


class AccessRecordService:
    def create(self, db: Session, current_user_id: Optional[int], **data) -> AccessRecord:
        obj = AccessRecord(**data)
        obj = access_record_dao.create(db, obj)
        db.commit()
        audit_log(db, current_user_id, "create", "access_record", getattr(obj, "access_id", None), None)
        return obj

    def list_by_filters(
        self,
        db: Session,
        elderly_id: int,
        start_time: Optional[str],
        end_time: Optional[str],
        abnormal: Optional[str],
        offset: int,
        limit: int,
    ) -> Sequence[AccessRecord]:
        return access_record_dao.list_by_filters(db, elderly_id, start_time, end_time, abnormal, offset, limit)

access_record_service = AccessRecordService()
