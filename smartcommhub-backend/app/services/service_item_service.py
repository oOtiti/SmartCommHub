from typing import Optional, Sequence
from sqlalchemy.orm import Session
from app.dao.service_item_dao import service_item_dao
from app.models.service_item import ServiceItem
from app.utils.audit import audit_log


class ServiceItemService:
    def create(self, db: Session, current_user_id: Optional[int], **data) -> ServiceItem:
        obj = ServiceItem(**data)
        obj = service_item_dao.create(db, obj)
        db.commit()
        audit_log(db, current_user_id, "create", "service_item", getattr(obj, "service_id", None), {"name": obj.name})
        return obj

    def list_by_provider(self, db: Session, provider_id: int, status: Optional[str], offset: int, limit: int) -> Sequence[ServiceItem]:
        return service_item_dao.list_by_provider(db, provider_id, status, offset, limit)

    def update(self, db: Session, current_user_id: Optional[int], service_id: int, **data) -> Optional[ServiceItem]:
        rows = service_item_dao.update_fields(db, service_id, data)
        if rows:
            db.commit()
            audit_log(db, current_user_id, "update", "service_item", service_id, data)
            return service_item_dao.get(db, service_id)
        return None

    def delete(self, db: Session, current_user_id: Optional[int], service_id: int) -> bool:
        rows = service_item_dao.delete(db, service_id)
        if rows:
            db.commit()
            audit_log(db, current_user_id, "delete", "service_item", service_id, None)
            return True
        return False

service_item_service = ServiceItemService()
