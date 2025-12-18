from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import text
from app.models.base import Base


class CommunityNotice(Base):
    __tablename__ = "community_notice"

    notice_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    community_id = Column(String(20), nullable=False)
    title = Column(String(100), nullable=False)
    content = Column(String(1000), nullable=False)
    publish_time = Column(DateTime, nullable=False, server_default=text("pg_systimestamp()"))
    target_group = Column(String(50), nullable=False)
