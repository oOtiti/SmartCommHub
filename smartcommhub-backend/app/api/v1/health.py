from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.services.health_record_service import health_record_service

router = APIRouter()


class HealthRecordCreateReq(BaseModel):
    elderly_id: int
    monitor_type: str
    monitor_value: str
    monitor_time: str
    is_abnormal: str


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_health_record(req: HealthRecordCreateReq, db: Session = Depends(get_db), current=Depends(get_current_user)):
    return health_record_service.create(db, getattr(current, "id", None), **req.model_deepcopy())


@router.get("/")
def list_health_records(
    elderly_id: int = Query(...),
    monitor_type: Optional[str] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    items = health_record_service.list_by_filters(db, elderly_id, monitor_type, start_time, end_time, offset, limit)
    return {"total": len(items), "offset": offset, "limit": limit, "items": items}
