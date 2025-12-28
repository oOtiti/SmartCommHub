from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from app.models.base import Base


class FamilyMember(Base):
    __tablename__ = "family_member"

    family_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    # 统一关联到账户的 user_id，一对一
    user_id = Column(Integer, ForeignKey("sys_usr_account.user_id", ondelete="CASCADE"), nullable=False, unique=True)
    name = Column(String(20), nullable=False)
    phone = Column(String(30), nullable=False)
    relation = Column(String(50), nullable=False)
    permission_level = Column(String(30), nullable=False)
    elderly_id = Column(Integer, ForeignKey("elderly.elderly_id", ondelete="CASCADE"), nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", name="family_member_user_id_key"),
    )
