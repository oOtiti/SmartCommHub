from typing import Sequence, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, update
from app.models.service_order import ServiceOrder
from app.dao.base_dao import BaseDAO


class ServiceOrderDAO(BaseDAO[ServiceOrder]):
    def __init__(self):
        super().__init__(ServiceOrder)

    def list(self, db: Session, elderly_id: Optional[int] = None, status: Optional[str] = None, offset: int = 0, limit: int = 50) -> Sequence[ServiceOrder]:
        stmt = select(ServiceOrder)
        if elderly_id is not None:
            stmt = stmt.where(ServiceOrder.elderly_id == elderly_id)
        if status:
            stmt = stmt.where(ServiceOrder.order_status == status)
        stmt = stmt.offset(offset).limit(limit)
        return db.execute(stmt).scalars().all()

    def list_by_elderly_ids(self, db: Session, elderly_ids: Sequence[int], status: Optional[str] = None, offset: int = 0, limit: int = 50) -> Sequence[ServiceOrder]:
        if not elderly_ids:
            return []
        from sqlalchemy import func
        stmt = select(ServiceOrder).where(ServiceOrder.elderly_id.in_(list(set(elderly_ids))))
        if status:
            stmt = stmt.where(ServiceOrder.order_status == status)
        stmt = stmt.offset(offset).limit(limit)
        return db.execute(stmt).scalars().all()

    def confirm(self, db: Session, order_id: int) -> int:
        # English enum per DB constraint
        stmt = update(ServiceOrder).where(ServiceOrder.order_id == order_id).values(order_status="confirmed").execution_options(synchronize_session="fetch")
        res = db.execute(stmt)
        return res.rowcount or 0

    def complete(self, db: Session, order_id: int) -> int:
        # English enum per DB constraint
        stmt = update(ServiceOrder).where(ServiceOrder.order_id == order_id).values(order_status="finished").execution_options(synchronize_session="fetch")
        res = db.execute(stmt)
        return res.rowcount or 0

    def rate(self, db: Session, order_id: int, score: int, content: Optional[str] = None) -> int:
        values = {"eval_score": score}
        if content is not None:
            values["eval_content"] = content
        stmt = update(ServiceOrder).where(ServiceOrder.order_id == order_id).values(**values).execution_options(synchronize_session="fetch")
        res = db.execute(stmt)
        return res.rowcount or 0

    def pay(self, db: Session, order_id: int) -> int:
        # set pay_status to 'paid' per DB constraint
        stmt = (
            update(ServiceOrder)
            .where(ServiceOrder.order_id == order_id)
            .values(pay_status="paid")
            .execution_options(synchronize_session="fetch")
        )
        res = db.execute(stmt)
        return res.rowcount or 0

service_order_dao = ServiceOrderDAO()
