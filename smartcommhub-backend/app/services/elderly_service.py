from typing import Optional, Tuple, Sequence
from sqlalchemy.orm import Session
from app.dao.elderly_dao import elderly_dao
from app.models.elderly import Elderly
from app.utils.audit import audit_log


class ElderlyService:
    def create(self, db: Session, current_user_id: Optional[int], **data) -> Elderly:
        obj = Elderly(**data)
        obj = elderly_dao.create(db, obj)
        db.commit()
        audit_log(db, current_user_id, "create", "elderly", getattr(obj, "elderly_id", None), {"name": obj.name})
        return obj

    def update(self, db: Session, current_user_id: Optional[int], elderly_id: int, **data) -> Optional[Elderly]:
        rows = elderly_dao.update_fields(db, elderly_id, data)
        if rows:
            db.commit()
            audit_log(db, current_user_id, "update", "elderly", elderly_id, data)
            return elderly_dao.get(db, elderly_id)
        return None

    def delete(self, db: Session, current_user_id: Optional[int], elderly_id: int) -> bool:
        rows = elderly_dao.delete(db, elderly_id)
        if rows:
            db.commit()
            audit_log(db, current_user_id, "delete", "elderly", elderly_id, None)
            return True
        return False

    def get(self, db: Session, elderly_id: int) -> Optional[Elderly]:
        return elderly_dao.get(db, elderly_id)

    def search(self, db: Session, keyword: Optional[str], page: int, size: int) -> Tuple[Sequence[Elderly], int]:
        return elderly_dao.search(db, keyword, page, size)

elderly_service = ElderlyService()
