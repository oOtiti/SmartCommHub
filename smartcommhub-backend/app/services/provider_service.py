from typing import Optional, Sequence
from sqlalchemy.orm import Session
from app.dao.provider_dao import provider_dao
from app.models.provider import Provider
from app.utils.audit import audit_log


class ProviderService:
    def create(self, db: Session, current_user_id: Optional[int], **data) -> Provider:
        obj = Provider(**data)
        obj = provider_dao.create(db, obj)
        db.commit()
        audit_log(db, current_user_id, "create", "provider", getattr(obj, "provider_id", None), {"name": obj.name})
        return obj

    def update(self, db: Session, current_user_id: Optional[int], provider_id: int, **data) -> Optional[Provider]:
        rows = provider_dao.update_fields(db, provider_id, data)
        if rows:
            db.commit()
            audit_log(db, current_user_id, "update", "provider", provider_id, data)
            return provider_dao.get(db, provider_id)
        return None

    def list_by_audit_status(self, db: Session, audit_status: str, offset: int = 0, limit: int = 50) -> Sequence[Provider]:
        return provider_dao.list_by_audit_status(db, audit_status, offset, limit)

    def get(self, db: Session, provider_id: int) -> Optional[Provider]:
        return provider_dao.get(db, provider_id)

provider_service = ProviderService()
