from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.services.service_order_service import service_order_service
from app.dao.family_member_dao import family_member_dao
from app.services.family_group_service import family_group_service
from app.services.elderly_service import elderly_service
from app.dao.elderly_dao import elderly_dao

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
    # 存储采用英文枚举，兼容前端旧值与中文值
    status_map = {
        # 英文别名
        "pending": "created",
        "confirmed": "confirmed",
        "completed": "finished",
        # 中文映射
        "待确认": "created",
        "已确认": "confirmed",
        "服务中": "in_service",
        "已完成": "finished",
        "已取消": "canceled",
    }
    pay_map = {
        # 英文保持
        "unpaid": "unpaid",
        "paid": "paid",
        "refunded": "refunded",
        # 中文映射
        "未支付": "unpaid",
        "已支付": "paid",
        "已退款": "refunded",
    }
    if data.get("order_status") in status_map:
        data["order_status"] = status_map[data["order_status"]]
    if data.get("pay_status") in pay_map:
        data["pay_status"] = pay_map[data["pay_status"]]
    return service_order_service.create(db, getattr(current, "user_id", None), **data)


@router.get("/")
def list_orders(elderly_id: Optional[int] = Query(None), status: Optional[str] = Query(None), offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db), current=Depends(get_current_user)):
    items = service_order_service.list(db, elderly_id, status, offset, limit)
    return {"total": len(items), "offset": offset, "limit": limit, "items": items}


@router.get("/by-account")
def list_orders_by_account(
    status: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    # 返回当前账户相关的订单：
    # - 老人账户：其本人 elderly_id 的订单
    # - 家属账户：其家庭下所有老人 elderly_id 的订单（若未配置家庭分组，回退到 family_member.elderly_id）
    # - 其他账户（管理员/服务商）：暂不聚合，返回空或需显式使用通用列表接口
    cur_uid = getattr(current, "user_id", None)
    user_type = getattr(current, "user_type", None)
    if cur_uid is None:
        return {"total": 0, "offset": offset, "limit": limit, "items": []}

    elderly_ids: list[int] = []
    if user_type == 1:
        # 老人账户
        me = elderly_dao.get_by_user_id(db, int(cur_uid))
        if me:
            elderly_ids.append(int(me.elderly_id))
    elif user_type == 2:
        # 家属账户
        fm = family_member_dao.get_by_user_id(db, int(cur_uid))
        if fm:
            elderly_ids = list(map(int, family_group_service.elders_by_family_id(db, int(fm.family_id)) or []))
            if not elderly_ids and getattr(fm, "elderly_id", None):
                elderly_ids = [int(fm.elderly_id)]

    if not elderly_ids:
        return {"total": 0, "offset": offset, "limit": limit, "items": []}

    items = service_order_service.list_by_elderly_ids(db, elderly_ids, status, offset, limit)
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


@router.patch("/{order_id}/pay")
def pay_order(order_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    ok = service_order_service.pay(db, getattr(current, "user_id", None), order_id)
    if not ok:
        raise HTTPException(status_code=404, detail="订单不存在或状态未变更")
    return {"ok": True}
