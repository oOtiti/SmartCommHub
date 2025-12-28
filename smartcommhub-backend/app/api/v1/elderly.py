from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.services.elderly_service import elderly_service
from app.dao.elderly_dao import elderly_dao

router = APIRouter()


class ElderlyCreateReq(BaseModel):
    name: str = Field(..., max_length=20)
    id_card: str = Field(..., max_length=18)
    age: int
    health_level: str = Field(..., max_length=10)
    emergency_contact: str = Field(..., max_length=11)
    address: str = Field(..., max_length=100)


class ElderlyUpdateReq(BaseModel):
    name: Optional[str] = Field(None, max_length=20)
    age: Optional[int] = None
    health_level: Optional[str] = Field(None, max_length=10)
    emergency_contact: Optional[str] = Field(None, max_length=11)
    address: Optional[str] = Field(None, max_length=100)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_elderly(req: ElderlyCreateReq, db: Session = Depends(get_db), current=Depends(get_current_user)):
    # 按新架构创建老人时必须写入 user_id
    uid = getattr(current, "user_id", None)
    if uid is None:
        raise HTTPException(status_code=400, detail="账户异常，无法创建老人档案")
    data = req.model_deepcopy()
    data.update({"user_id": int(uid)})
    return elderly_service.create(db, current_user_id=int(uid), **data)


@router.get("/")
def list_elders(
    keyword: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    items, total = elderly_service.search(db, keyword, page, size)
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": items,
        "has_next": page * size < total,
        "has_prev": page > 1,
        "pages": (total + size - 1) // size,
    }


@router.get("/me")
def get_my_elderly(db: Session = Depends(get_db), current=Depends(get_current_user)):
    uid = getattr(current, "user_id", None)
    if uid is None:
        raise HTTPException(status_code=404, detail="未登录或账户异常")
    obj = elderly_dao.get_by_user_id(db, int(uid))
    if not obj:
        raise HTTPException(status_code=404, detail="当前账户未绑定老人信息")
    return obj


@router.get("/{elderly_id}")
def get_elderly(elderly_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    obj = elderly_service.get(db, elderly_id)
    if not obj:
        raise HTTPException(status_code=404, detail="老人档案不存在")
    return obj


@router.put("/{elderly_id}")
def update_elderly(elderly_id: int, req: ElderlyUpdateReq, db: Session = Depends(get_db), current=Depends(get_current_user)):
    obj = elderly_service.update(db, getattr(current, "user_id", None), elderly_id, **req.model_dump(exclude_unset=True))
    if not obj:
        raise HTTPException(status_code=404, detail="老人档案不存在或未更新")
    return obj


@router.delete("/{elderly_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_elderly(elderly_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    ok = elderly_service.delete(db, getattr(current, "user_id", None), elderly_id)
    if not ok:
        raise HTTPException(status_code=404, detail="老人档案不存在")
    return None
