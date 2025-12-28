from typing import Optional, Sequence
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.provider import Provider
from app.dao.base_dao import BaseDAO


class ProviderDAO(BaseDAO[Provider]):
    def __init__(self):
        super().__init__(Provider)

    def get_by_qualification(self, db: Session, qualification_id: str) -> Optional[Provider]:
        stmt = select(Provider).where(Provider.qualification_id == qualification_id).limit(1)
        return db.execute(stmt).scalars().first()

    def list_by_audit_status(self, db: Session, audit_status: str, offset: int = 0, limit: int = 50) -> Sequence[Provider]:
        stmt = select(Provider).where(Provider.audit_status == audit_status).offset(offset).limit(limit)
        return db.execute(stmt).scalars().all()

    def get_by_user_id(self, db: Session, user_id: int) -> Optional[Provider]:
        stmt = select(Provider).where(Provider.user_id == user_id).limit(1)
        return db.execute(stmt).scalars().first()

provider_dao = ProviderDAO()
