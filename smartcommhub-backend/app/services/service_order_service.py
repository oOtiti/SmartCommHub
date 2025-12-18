from typing import Optional, Sequence
from sqlalchemy.orm import Session
from app.dao.service_order_dao import service_order_dao
from app.models.service_order import ServiceOrder
from app.utils.audit import audit_log


class ServiceOrderService:
    def create(self, db: Session, current_user_id: Optional[int], **data) -> ServiceOrder:
        obj = ServiceOrder(**data)
        obj = service_order_dao.create(db, obj)
        db.commit()
        audit_log(db, current_user_id, "create", "service_order", getattr(obj, "order_id", None), None)
        return obj

    def list(self, db: Session, elderly_id: Optional[int], status: Optional[str], offset: int, limit: int) -> Sequence[ServiceOrder]:
        return service_order_dao.list(db, elderly_id, status, offset, limit)

    def confirm(self, db: Session, current_user_id: Optional[int], order_id: int) -> bool:
        rows = service_order_dao.confirm(db, order_id)
        if rows:
            db.commit()
            audit_log(db, current_user_id, "confirm", "service_order", order_id, None)
            return True
        return False

    def complete(self, db: Session, current_user_id: Optional[int], order_id: int) -> bool:
        rows = service_order_dao.complete(db, order_id)
        if rows:
            db.commit()
            audit_log(db, current_user_id, "complete", "service_order", order_id, None)
            return True
        return False

    def rate(self, db: Session, current_user_id: Optional[int], order_id: int, score: int, content: Optional[str]) -> bool:
        rows = service_order_dao.rate(db, order_id, score, content)
        if rows:
            db.commit()
            audit_log(db, current_user_id, "rate", "service_order", order_id, {"score": score})
            return True
        return False

service_order_service = ServiceOrderService()
