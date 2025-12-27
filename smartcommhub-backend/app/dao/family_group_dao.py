from typing import Sequence
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.family_group import FamilyGroup
from app.dao.base_dao import BaseDAO


class FamilyGroupDAO(BaseDAO[FamilyGroup]):
    def __init__(self):
        super().__init__(FamilyGroup)

family_group_dao = FamilyGroupDAO()
