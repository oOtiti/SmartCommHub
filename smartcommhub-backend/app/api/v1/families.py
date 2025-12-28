from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.dao.family_member_dao import family_member_dao
from app.models.family_member import FamilyMember
from app.services.family_group_service import family_group_service
from app.services.elderly_service import elderly_service

router = APIRouter()


class FamilyMemberOut(BaseModel):
    family_id: int
    name: str
    phone: str
    relation: str
    permission_level: str
    elderly_id: int

    class Config:
        from_attributes = True


class FamilyMemberCreateReq(BaseModel):
    elderly_id: int
    name: str
    phone: str
    relation: str
    permission_level: str = "view"


@router.post("/members", status_code=status.HTTP_201_CREATED)
def create_family_member(
    req: FamilyMemberCreateReq,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    """创建家族成员关联"""
    fm = FamilyMember(
        name=req.name,
        phone=req.phone,
        relation=req.relation,
        permission_level=req.permission_level,
        elderly_id=req.elderly_id,
    )
    result = family_member_dao.create(db, fm)
    db.commit()
    return FamilyMemberOut.model_validate(result)


@router.get("/by-elderly/{elderly_id}")
def list_family_members_by_elderly(
    elderly_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    items = family_member_dao.list_by_elderly(db, elderly_id, offset, limit)
    return {
        "total": len(items),
        "offset": offset,
        "limit": limit,
        "items": [FamilyMemberOut.model_validate(i) for i in items],
    }


@router.get("/by-account/elders")
def list_elders_by_account(
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    # 管理员/运营返回空数组以避免暴露所有数据；前端需指定elderly_id再查详情
    # 家属账号：通过 family_id -> group -> elderly 映射；若无映射，回退到 family_member.elderly_id
    result = []
    family_id = getattr(current, "family_id", None)
    if family_id:
        elder_ids = family_group_service.elders_by_family_id(db, int(family_id))
        if not elder_ids:
            # 回退：直接用 family_member.family_id 的绑定老人
            fm = family_member_dao.get(db, int(family_id))
            if fm and getattr(fm, "elderly_id", None):
                elder_ids = [int(fm.elderly_id)]
        # 拉取老人简要信息
        for eid in elder_ids:
            obj = elderly_service.get(db, eid)
            if obj:
                result.append(obj)
    return {"items": result}
