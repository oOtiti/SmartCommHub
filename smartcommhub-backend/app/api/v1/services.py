from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.services.service_item_service import service_item_service

router = APIRouter()


class ServiceItemCreateReq(BaseModel):
    provider_id: int
    name: str = Field(..., max_length=100)
    content: str = Field(..., max_length=500)
    duration: str = Field(..., max_length=20)
    price: float
    service_scope: str = Field(..., max_length=200)
    status: str = Field(..., max_length=30)


class ServiceItemUpdateReq(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    content: Optional[str] = Field(None, max_length=500)
    duration: Optional[str] = Field(None, max_length=20)
    price: Optional[float] = None
    service_scope: Optional[str] = Field(None, max_length=200)
    status: Optional[str] = Field(None, max_length=30)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_service_item(req: ServiceItemCreateReq, db: Session = Depends(get_db), current=Depends(get_current_user)):
    # 统一使用 pydantic v2 的 model_dump，并修正当前用户ID为 user_id
    data = req.model_dump(exclude_unset=True)
    # 兼容前端旧值：active/inactive 映射到 online/offline
    status = data.get("status")
    if status in {"active", "inactive"}:
        data["status"] = "online" if status == "active" else "offline"
    return service_item_service.create(db, getattr(current, "user_id", None), **data)


@router.get("/")
def list_service_items(provider_id: int = Query(...), status: Optional[str] = Query(None), offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db), current=Depends(get_current_user)):
    items = service_item_service.list_by_provider(db, provider_id, status, offset, limit)
    return {"total": len(items), "offset": offset, "limit": limit, "items": items}

@router.put("/{service_id}")
def update_service_item(service_id: int, req: ServiceItemUpdateReq, db: Session = Depends(get_db), current=Depends(get_current_user)):
    data = req.model_dump(exclude_unset=True)
    # 兼容前端旧值：active/inactive 映射到 online/offline
    status = data.get("status")
    if status in {"active", "inactive"}:
        data["status"] = "online" if status == "active" else "offline"
    obj = service_item_service.update(db, getattr(current, "user_id", None), service_id, **data)
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="服务不存在或未更新")
    return obj

@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service_item(service_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    ok = service_item_service.delete(db, getattr(current, "user_id", None), service_id)
    if not ok:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="服务不存在或已删除")
    return None
