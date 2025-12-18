from typing import Sequence
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.community_notice import CommunityNotice
from app.dao.base_dao import BaseDAO


class CommunityNoticeDAO(BaseDAO[CommunityNotice]):
    def __init__(self):
        super().__init__(CommunityNotice)

    def list_by_target(self, db: Session, target_group: str, offset: int = 0, limit: int = 50) -> Sequence[CommunityNotice]:
        stmt = select(CommunityNotice).where(CommunityNotice.target_group == target_group).offset(offset).limit(limit)
        return db.execute(stmt).scalars().all()

community_notice_dao = CommunityNoticeDAO()
