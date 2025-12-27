from sqlalchemy import Column, Integer, ForeignKey
from app.models.base import Base


class FamilyGroupMemberMap(Base):
    __tablename__ = "family_group_member_map"

    id = Column(Integer, primary_key=True, autoincrement=True)
    group_id = Column(Integer, ForeignKey("family_group.group_id", ondelete="CASCADE"), nullable=False, index=True)
    family_id = Column(Integer, ForeignKey("family_member.family_id", ondelete="CASCADE"), nullable=False, index=True)
