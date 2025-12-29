from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.services.service_order_service import service_order_service

router = APIRouter()


class OrderCreateReq(BaseModel):
    elderly_id: int
    service_id: int
    reserve_time: str
    service_time: str
    order_status: str
    pay_status: str


class RateReq(BaseModel):
    score: int
    content: Optional[str] = None


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_order(req: OrderCreateReq, db: Session = Depends(get_db), current=Depends(get_current_user)):
    data = req.model_dump(exclude_unset=True)
    # 存储采用英文枚举，兼容前端旧值
    status_map = {
        "pending": "created",
        "confirmed": "confirmed",
        "completed": "finished",
    }
    # pay_status 英文枚举已与数据库一致（unpaid/paid/refunded）
    if data.get("order_status") in status_map:
        data["order_status"] = status_map[data["order_status"]]
    return service_order_service.create(db, getattr(current, "user_id", None), **data)


@router.get("/")
def list_orders(elderly_id: Optional[int] = Query(None), status: Optional[str] = Query(None), offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db), current=Depends(get_current_user)):
    items = service_order_service.list(db, elderly_id, status, offset, limit)
    return {"total": len(items), "offset": offset, "limit": limit, "items": items}


@router.patch("/{order_id}/confirm")
def confirm_order(order_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    ok = service_order_service.confirm(db, getattr(current, "user_id", None), order_id)
    if not ok:
        raise HTTPException(status_code=404, detail="订单不存在或状态未变更")
    return {"ok": True}


@router.patch("/{order_id}/complete")
def complete_order(order_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    ok = service_order_service.complete(db, getattr(current, "user_id", None), order_id)
    if not ok:
        raise HTTPException(status_code=404, detail="订单不存在或状态未变更")
    return {"ok": True}


@router.patch("/{order_id}/rate")
def rate_order(order_id: int, req: RateReq, db: Session = Depends(get_db), current=Depends(get_current_user)):
    ok = service_order_service.rate(db, getattr(current, "user_id", None), order_id, req.score, req.content)
    if not ok:
        raise HTTPException(status_code=404, detail="订单不存在或未更新")
    return {"ok": True}
