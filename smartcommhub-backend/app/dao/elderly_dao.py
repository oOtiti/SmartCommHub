from typing import Optional, Sequence, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.elderly import Elderly
from app.dao.base_dao import BaseDAO


class ElderlyDAO(BaseDAO[Elderly]):
    def __init__(self):
        super().__init__(Elderly)

    def get_by_id_card(self, db: Session, id_card: str) -> Optional[Elderly]:
        stmt = select(Elderly).where(Elderly.id_card == id_card).limit(1)
        return db.execute(stmt).scalars().first()

    def search(self, db: Session, keyword: Optional[str], page: int, size: int) -> Tuple[Sequence[Elderly], int]:
        base = select(Elderly)
        if keyword:
            base = base.where(Elderly.name.ilike(f"%{keyword}%"))
        total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
        items = db.execute(base.offset((page - 1) * size).limit(size)).scalars().all()
        return items, total

    def get_by_user_id(self, db: Session, user_id: int) -> Optional[Elderly]:
        stmt = select(Elderly).where(Elderly.user_id == user_id).limit(1)
        return db.execute(stmt).scalars().first()

elderly_dao = ElderlyDAO()
