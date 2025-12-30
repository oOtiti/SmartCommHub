from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.services.provider_service import provider_service
from app.dao.provider_dao import provider_dao

router = APIRouter()


class ProviderCreateReq(BaseModel):
    name: str = Field(..., max_length=100)
    service_type: str = Field(..., max_length=50)
    service_nature: str = Field(..., max_length=50)
    qualification_id: str = Field(..., max_length=50)
    contact: str = Field(..., max_length=50)
    audit_status: str = Field(..., max_length=10)
    belong_community: str = Field(..., max_length=50)


class ProviderUpdateReq(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    service_type: Optional[str] = Field(None, max_length=50)
    service_nature: Optional[str] = Field(None, max_length=50)
    contact: Optional[str] = Field(None, max_length=50)
    audit_status: Optional[str] = Field(None, max_length=10)
    belong_community: Optional[str] = Field(None, max_length=50)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_provider(req: ProviderCreateReq, db: Session = Depends(get_db), current=Depends(get_current_user)):
    # 创建服务商时必须写入 user_id
    uid = getattr(current, "user_id", None)
    if uid is None:
        raise HTTPException(status_code=400, detail="账户异常，无法创建服务商")
    data = req.model_deepcopy()
    data.update({"user_id": int(uid)})
    return provider_service.create(db, getattr(current, "user_id", None), **data)


@router.get("/")
def list_providers(audit_status: str = Query(...), offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db), current=Depends(get_current_user)):
    items = provider_service.list_by_audit_status(db, audit_status, offset, limit)
    return {"total": len(items), "offset": offset, "limit": limit, "items": items}


@router.get("/me")
def get_my_provider(db: Session = Depends(get_db), current=Depends(get_current_user)):
    uid = getattr(current, "user_id", None)
    if uid is None:
        raise HTTPException(status_code=404, detail="未登录或账户异常")
    obj = provider_dao.get_by_user_id(db, int(uid))
    if not obj:
        raise HTTPException(status_code=404, detail="当前账户未绑定服务商信息")
    return obj


@router.patch("/me")
def update_my_provider(req: ProviderUpdateReq, db: Session = Depends(get_db), current=Depends(get_current_user)):
    uid = getattr(current, "user_id", None)
    if uid is None:
        raise HTTPException(status_code=404, detail="未登录或账户异常")
    obj = provider_dao.get_by_user_id(db, int(uid))
    if not obj:
        raise HTTPException(status_code=404, detail="当前账户未绑定服务商信息")
    updated = provider_service.update(db, getattr(current, "user_id", None), int(obj.provider_id), **req.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=400, detail="服务商资料未更新")
    return updated


@router.get("/{provider_id}")
def get_provider(provider_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    obj = provider_service.get(db, provider_id)
    if not obj:
        raise HTTPException(status_code=404, detail="服务商不存在")
    return obj


@router.put("/{provider_id}")
def update_provider(provider_id: int, req: ProviderUpdateReq, db: Session = Depends(get_db), current=Depends(get_current_user)):
    obj = provider_service.update(db, getattr(current, "user_id", None), provider_id, **req.model_dump(exclude_unset=True))
    if not obj:
        raise HTTPException(status_code=404, detail="服务商不存在或未更新")
    return obj
