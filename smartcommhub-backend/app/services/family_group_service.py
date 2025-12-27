from typing import List, Sequence
from sqlalchemy.orm import Session

from app.dao.family_group_member_map_dao import family_group_member_map_dao
from app.dao.family_group_elder_map_dao import family_group_elder_map_dao


class FamilyGroupService:
    def elders_by_family_id(self, db: Session, family_id: int) -> List[int]:
        groups = family_group_member_map_dao.list_groups_by_family_id(db, family_id)
        group_ids = [g.group_id for g in groups]
        maps = family_group_elder_map_dao.list_elders_by_group_ids(db, group_ids)
        return [m.elderly_id for m in maps]


family_group_service = FamilyGroupService()
