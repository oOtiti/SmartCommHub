from typing import Sequence, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.service_item import ServiceItem
from app.dao.base_dao import BaseDAO


class ServiceItemDAO(BaseDAO[ServiceItem]):
    def __init__(self):
        super().__init__(ServiceItem)

    def list_by_provider(self, db: Session, provider_id: int, status: Optional[str] = None, offset: int = 0, limit: int = 50) -> Sequence[ServiceItem]:
        stmt = select(ServiceItem).where(ServiceItem.provider_id == provider_id)
        if status:
            stmt = stmt.where(ServiceItem.status == status)
        stmt = stmt.offset(offset).limit(limit)
        return db.execute(stmt).scalars().all()

service_item_dao = ServiceItemDAO()
