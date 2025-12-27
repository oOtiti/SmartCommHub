from typing import Sequence
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.family_group_elder_map import FamilyGroupElderMap
from app.dao.base_dao import BaseDAO


class FamilyGroupElderMapDAO(BaseDAO[FamilyGroupElderMap]):
    def __init__(self):
        super().__init__(FamilyGroupElderMap)

    def list_elders_by_group_ids(self, db: Session, group_ids: Sequence[int]) -> Sequence[FamilyGroupElderMap]:
        if not group_ids:
            return []
        stmt = select(FamilyGroupElderMap).where(FamilyGroupElderMap.group_id.in_(group_ids))
        return db.execute(stmt).scalars().all()

family_group_elder_map_dao = FamilyGroupElderMapDAO()
