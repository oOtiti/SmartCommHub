from typing import Sequence
from sqlalchemy.orm import Session
from app.dao.community_notice_dao import community_notice_dao
from app.models.community_notice import CommunityNotice
from app.utils.audit import audit_log


class CommunityNoticeService:
    def create(self, db: Session, current_user_id: int, **data) -> CommunityNotice:
        obj = CommunityNotice(**data)
        obj = community_notice_dao.create(db, obj)
        db.commit()
        audit_log(db, current_user_id, "create", "community_notice", getattr(obj, "notice_id", None), {"title": obj.title})
        return obj

    def list_by_target(self, db: Session, target_group: str, offset: int, limit: int) -> Sequence[CommunityNotice]:
        return community_notice_dao.list_by_target(db, target_group, offset, limit)

community_notice_service = CommunityNoticeService()
