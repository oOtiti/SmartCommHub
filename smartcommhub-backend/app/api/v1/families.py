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
    user_id: int
    name: str
    phone: str
    relation: str
    permission_level: str
    elderly_id: int | None = None

    class Config:
        from_attributes = True


class FamilyMemberCreateReq(BaseModel):
    user_id: int
    name: str
    phone: str
    relation: str
    permission_level: str = "view"
    elderly_id: int | None = None


class FamilyMemberUpdateReq(BaseModel):
    name: str | None = None
    phone: str | None = None
    relation: str | None = None
    permission_level: str | None = None
    elderly_id: int | None = None


@router.post("/members", status_code=status.HTTP_201_CREATED)
def create_family_member(
    req: FamilyMemberCreateReq,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    """创建家族成员关联"""
    fm = FamilyMember(
        user_id=req.user_id,
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
    # 使用当前账户的 user_id 解析到家属实体，再通过家属实体的 family_id 查询其家庭下老人
    result = []
    cur_uid = getattr(current, "user_id", None)
    if cur_uid is None:
        return {"items": []}
    fm = family_member_dao.get_by_user_id(db, int(cur_uid))
    # 若未绑定家属实体，且为老人账户，则返回其本人
    if not fm:
        try:
            from app.dao.elderly_dao import elderly_dao
            # 仅老人用户有此回退意义
            if getattr(current, "user_type", None) == 1:
                me = elderly_dao.get_by_user_id(db, int(cur_uid))
                if me:
                    return {"items": [me]}
        except Exception:
            pass
        return {"items": []}
    elder_ids = family_group_service.elders_by_family_id(db, int(fm.family_id))
    # 回退：如果未配置家庭分组映射，且该家属实体存在 legacy 的 elderly_id，则返回该老人
    if not elder_ids and getattr(fm, "elderly_id", None):
        elder_ids = [int(fm.elderly_id)]
    for eid in elder_ids:
        obj = elderly_service.get(db, eid)
        if obj:
            result.append(obj)
    return {"items": result}

@router.get("/me", response_model=FamilyMemberOut)
def get_my_family_member(
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    cur_uid = getattr(current, "user_id", None)
    if cur_uid is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="未找到家属信息（未登录或账户异常）")
    fm = family_member_dao.get_by_user_id(db, int(cur_uid))
    if not fm:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="当前账户未绑定家属信息")
    return FamilyMemberOut.model_validate(fm)


@router.patch("/me", response_model=FamilyMemberOut)
def update_my_family_member(
    req: FamilyMemberUpdateReq,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    cur_uid = getattr(current, "user_id", None)
    if cur_uid is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="未登录或账户异常")
    fm = family_member_dao.get_by_user_id(db, int(cur_uid))
    if not fm:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="当前账户未绑定家属信息")
    from app.utils.audit import audit_log
    data = req.model_dump(exclude_unset=True)
    rows = family_member_dao.update_fields(db, int(fm.family_id), data)
    if rows:
        db.commit()
        audit_log(db, int(cur_uid), "update", "family_member", int(fm.family_id), data)
        updated = family_member_dao.get(db, int(fm.family_id))
        return FamilyMemberOut.model_validate(updated)
    from fastapi import HTTPException
    raise HTTPException(status_code=400, detail="家属资料未更新")
