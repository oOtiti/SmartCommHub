from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.user import User
from app.core.security import verify_password, get_password_hash
from app.dao.user_dao import user_dao

class UserService:
    def get_by_username(self, db: Session, username: str) -> Optional[User]:
        stmt = select(User).where(User.username == username)
        return db.execute(stmt).scalar_one_or_none()

    def authenticate(self, db: Session, username: str, password: str) -> Optional[User]:
        user = self.get_by_username(db, username)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            # 登陆失败计数（不影响主流程）
            try:
                user_dao.incr_failed_attempts(db, getattr(user, "user_id", None) or 0)
                db.commit()
            except Exception:
                db.rollback()
            return None
        # 登陆成功，记录时间与清零失败计数
        try:
            user_dao.set_last_login(db, user.user_id)
            db.commit()
        except Exception:
            db.rollback()
        return user

    def create_user(self, db: Session, username: str, password: str, user_type: int = 4, is_active: bool = True, **extra) -> User:
        hashed = get_password_hash(password)
        user = User(
            username=username,
            password_hash=hashed,
            user_type=user_type,
            is_active=is_active,
            **extra,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def change_password(self, db: Session, user: User, old_password: str, new_password: str) -> bool:
        if not verify_password(old_password, user.password_hash):
            return False
        new_hash = get_password_hash(new_password)
        rows = user_dao.update_password(db, user.user_id, new_hash)
        db.commit()
        return rows > 0

    def admin_reset_password(self, db: Session, target: User, new_password: str) -> bool:
        new_hash = get_password_hash(new_password)
        rows = user_dao.update_password(db, target.user_id, new_hash)
        db.commit()
        return rows > 0

user_service = UserService()
