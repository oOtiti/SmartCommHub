from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, update
from app.models.user import User
from app.dao.base_dao import BaseDAO


class UserDAO(BaseDAO[User]):
    def __init__(self):
        super().__init__(User)

    def get_by_username(self, db: Session, username: str) -> Optional[User]:
        stmt = select(User).where(User.username == username).limit(1)
        return db.execute(stmt).scalars().first()

    def get_by_phone(self, db: Session, phone: str) -> Optional[User]:
        stmt = select(User).where(User.phone == phone).limit(1)
        return db.execute(stmt).scalars().first()

    def get_by_id(self, db: Session, user_id: int) -> Optional[User]:
        stmt = select(User).where(User.user_id == user_id).limit(1)
        return db.execute(stmt).scalars().first()

    def update_password(self, db: Session, user_id: int, new_hash: str) -> int:
        stmt = (
            update(User)
            .where(User.user_id == user_id)
            .values(
                password_hash=new_hash,
                failed_attempts=0,
                locked_until=None,
                pwd_changed_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
        )
        res = db.execute(stmt)
        return res.rowcount or 0

    def set_last_login(self, db: Session, user_id: int) -> None:
        stmt = (
            update(User)
            .where(User.user_id == user_id)
            .values(last_login_at=datetime.utcnow(), failed_attempts=0, updated_at=datetime.utcnow())
        )
        db.execute(stmt)

    def incr_failed_attempts(self, db: Session, user_id: int) -> None:
        # 简化实现：直接+1（开销小，可接受）
        user = self.get_by_id(db, user_id)
        if user:
            stmt = (
                update(User)
                .where(User.user_id == user_id)
                .set({User.failed_attempts: user.failed_attempts + 1, User.updated_at: datetime.utcnow()})
            )
            db.execute(stmt)

user_dao = UserDAO()
