from sqlalchemy import Column, Integer, ForeignKey
from app.models.base import Base


class FamilyGroupElderMap(Base):
    __tablename__ = "family_group_elder_map"

    id = Column(Integer, primary_key=True, autoincrement=True)
    group_id = Column(Integer, ForeignKey("family_group.group_id", ondelete="CASCADE"), nullable=False, index=True)
    elderly_id = Column(Integer, ForeignKey("elderly.elderly_id", ondelete="CASCADE"), nullable=False, index=True)
