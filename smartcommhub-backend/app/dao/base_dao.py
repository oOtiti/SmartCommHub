from typing import TypeVar, Generic, Type, Sequence, Optional, Any, Mapping
from sqlalchemy.orm import Session
from sqlalchemy import select, update, delete, func

TModel = TypeVar("TModel")


class BaseDAO(Generic[TModel]):
    def __init__(self, model: Type[TModel]):
        self.model = model

    def get(self, db: Session, id: Any) -> Optional[TModel]:
        return db.get(self.model, id)

    def list(self, db: Session, offset: int = 0, limit: int = 50) -> Sequence[TModel]:
        stmt = select(self.model).offset(offset).limit(limit)
        return db.execute(stmt).scalars().all()

    def count(self, db: Session) -> int:
        stmt = select(func.count()).select_from(self.model)
        return db.execute(stmt).scalar_one()

    def create(self, db: Session, obj: TModel) -> TModel:
        db.add(obj)
        db.flush()
        db.refresh(obj)
        return obj

    def update_fields(self, db: Session, id: Any, values: Mapping[str, Any]) -> int:
        pk_col = list(self.model.__table__.primary_key.columns)[0]
        stmt = (
            update(self.model)
            .where(pk_col == id)
            .values(**values)
            .execution_options(synchronize_session="fetch")
        )
        res = db.execute(stmt)
        return res.rowcount or 0

    def delete(self, db: Session, id: Any) -> int:
        pk_col = list(self.model.__table__.primary_key.columns)[0]
        stmt = delete(self.model).where(pk_col == id)
        res = db.execute(stmt)
        return res.rowcount or 0
