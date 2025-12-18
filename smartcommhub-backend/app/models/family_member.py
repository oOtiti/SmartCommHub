from sqlalchemy import Column, Integer, String, ForeignKey
from app.models.base import Base


class FamilyMember(Base):
    __tablename__ = "family_member"

    family_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(20), nullable=False)
    phone = Column(String(30), nullable=False)
    relation = Column(String(50), nullable=False)
    permission_level = Column(String(30), nullable=False)
    elderly_id = Column(Integer, ForeignKey("elderly.elderly_id", ondelete="CASCADE"), nullable=False)
