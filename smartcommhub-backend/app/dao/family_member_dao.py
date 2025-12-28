from typing import Sequence, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.family_member import FamilyMember
from app.dao.base_dao import BaseDAO


class FamilyMemberDAO(BaseDAO[FamilyMember]):
    def __init__(self):
        super().__init__(FamilyMember)

    def list_by_elderly(self, db: Session, elderly_id: int, offset: int = 0, limit: int = 50) -> Sequence[FamilyMember]:
        stmt = select(FamilyMember).where(FamilyMember.elderly_id == elderly_id).offset(offset).limit(limit)
        return db.execute(stmt).scalars().all()

    def get_by_user_id(self, db: Session, user_id: int) -> Optional[FamilyMember]:
        stmt = select(FamilyMember).where(FamilyMember.user_id == user_id).limit(1)
        return db.execute(stmt).scalars().first()

family_member_dao = FamilyMemberDAO()
