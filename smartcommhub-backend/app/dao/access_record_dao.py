from typing import Sequence, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.access_record import AccessRecord
from app.dao.base_dao import BaseDAO


class AccessRecordDAO(BaseDAO[AccessRecord]):
    def __init__(self):
        super().__init__(AccessRecord)

    def list_by_filters(
        self,
        db: Session,
        elderly_id: int,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        abnormal: Optional[str] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> Sequence[AccessRecord]:
        stmt = select(AccessRecord).where(AccessRecord.elderly_id == elderly_id)
        if start_time:
            stmt = stmt.where(AccessRecord.record_time >= start_time)
        if end_time:
            stmt = stmt.where(AccessRecord.record_time <= end_time)
        if abnormal is not None:
            stmt = stmt.where(AccessRecord.is_abnormal == abnormal)
        stmt = stmt.offset(offset).limit(limit)
        return db.execute(stmt).scalars().all()

access_record_dao = AccessRecordDAO()
