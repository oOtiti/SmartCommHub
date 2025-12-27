from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.dao.alert_dao import alert_dao

router = APIRouter()


class AlertOut(BaseModel):
    alert_id: int
    elderly_id: int
    monitor_type: str
    monitor_value: float
    monitor_time: datetime
    device_id: str
    global_abnormal: int
    personal_abnormal: int
    score: Optional[float] = None
    confidence: Optional[float] = None
    k: Optional[float] = None
    n: Optional[int] = None
    mu: Optional[float] = None
    sigma: Optional[float] = None
    ack_status: str
    ack_time: Optional[datetime] = None
    silence_until: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.get("/")
def list_alerts(
    elderly_id: Optional[int] = Query(None),
    monitor_type: Optional[str] = Query(None),
    ack_status: Optional[str] = Query(None),
    global_abnormal: Optional[int] = Query(None),
    personal_abnormal: Optional[int] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    items = alert_dao.list_filtered(
        db,
        elderly_id=elderly_id,
        monitor_type=monitor_type,
        ack_status=ack_status,
        global_abnormal=global_abnormal,
        personal_abnormal=personal_abnormal,
        offset=offset,
        limit=limit,
    )
    return {
        "total": len(items),
        "offset": offset,
        "limit": limit,
        "items": [AlertOut.model_validate(i) for i in items],
    }


@router.patch("/{alert_id}/ack")
def ack_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    updated = alert_dao.ack(db, alert_id)
    db.commit()
    return {"ok": bool(updated)}


class SilenceIn(BaseModel):
    minutes: Optional[int] = None
    until: Optional[datetime] = None


@router.patch("/{alert_id}/silence")
def silence_alert(
    alert_id: int,
    data: SilenceIn,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    until = data.until
    if not until and data.minutes:
        until = datetime.utcnow() + timedelta(minutes=int(data.minutes))
    updated = alert_dao.silence_until(db, alert_id, until)
    db.commit()
    return {"ok": bool(updated), "until": until.isoformat() if until else None}
