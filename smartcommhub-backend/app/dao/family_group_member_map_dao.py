from typing import Sequence
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.family_group_member_map import FamilyGroupMemberMap
from app.dao.base_dao import BaseDAO


class FamilyGroupMemberMapDAO(BaseDAO[FamilyGroupMemberMap]):
    def __init__(self):
        super().__init__(FamilyGroupMemberMap)

    def list_groups_by_family_id(self, db: Session, family_id: int) -> Sequence[FamilyGroupMemberMap]:
        stmt = select(FamilyGroupMemberMap).where(FamilyGroupMemberMap.family_id == family_id)
        return db.execute(stmt).scalars().all()

family_group_member_map_dao = FamilyGroupMemberMapDAO()
