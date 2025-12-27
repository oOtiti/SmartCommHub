from sqlalchemy import Column, Integer, String
from app.models.base import Base


class FamilyGroup(Base):
    __tablename__ = "family_group"

    group_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(50), nullable=False)
