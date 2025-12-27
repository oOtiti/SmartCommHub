from typing import Sequence, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, update
from app.models.alert import Alert
from app.dao.base_dao import BaseDAO


class AlertDAO(BaseDAO[Alert]):
    def __init__(self):
        super().__init__(Alert)

    def list_filtered(
        self,
        db: Session,
        elderly_id: Optional[int] = None,
        monitor_type: Optional[str] = None,
        ack_status: Optional[str] = None,
        global_abnormal: Optional[int] = None,
        personal_abnormal: Optional[int] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> Sequence[Alert]:
        stmt = select(Alert)
        if elderly_id is not None:
            stmt = stmt.where(Alert.elderly_id == elderly_id)
        if monitor_type:
            stmt = stmt.where(Alert.monitor_type == monitor_type)
        if ack_status:
            stmt = stmt.where(Alert.ack_status == ack_status)
        if global_abnormal is not None:
            stmt = stmt.where(Alert.global_abnormal == int(global_abnormal))
        if personal_abnormal is not None:
            stmt = stmt.where(Alert.personal_abnormal == int(personal_abnormal))
        stmt = stmt.order_by(Alert.monitor_time.desc()).offset(offset).limit(limit)
        return db.execute(stmt).scalars().all()

    def ack(self, db: Session, alert_id: int) -> int:
        stmt = (
            update(Alert)
            .where(Alert.alert_id == alert_id)
            .values(ack_status="ACKED")
            .execution_options(synchronize_session="fetch")
        )
        res = db.execute(stmt)
        return res.rowcount or 0

    def silence_until(self, db: Session, alert_id: int, until) -> int:
        stmt = (
            update(Alert)
            .where(Alert.alert_id == alert_id)
            .values(silence_until=until)
            .execution_options(synchronize_session="fetch")
        )
        res = db.execute(stmt)
        return res.rowcount or 0


alert_dao = AlertDAO()
