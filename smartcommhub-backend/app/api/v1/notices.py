from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.services.community_notice_service import community_notice_service

router = APIRouter()


class NoticeCreateReq(BaseModel):
    community_id: str = Field(..., max_length=20)
    title: str = Field(..., max_length=100)
    content: str = Field(..., max_length=1000)
    target_group: str = Field(..., max_length=50)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_notice(req: NoticeCreateReq, db: Session = Depends(get_db), current=Depends(get_current_user)):
    return community_notice_service.create(db, getattr(current, "id", None), **req.model_deepcopy())


@router.get("/")
def list_notices(target_group: str = Query(...), offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db), current=Depends(get_current_user)):
    items = community_notice_service.list_by_target(db, target_group, offset, limit)
    return {"total": len(items), "offset": offset, "limit": limit, "items": items}
