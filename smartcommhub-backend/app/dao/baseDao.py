# DAO基类，实现通用CRUD、分页、计数
from typing import TypeVar, Generic, Type, Sequence, Optional, Any, Mapping
from sqlalchemy.orm import Session


TModel = TypeVar("TModel")