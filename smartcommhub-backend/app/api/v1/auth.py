# 认证相关
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token
from app.api.deps import get_current_user
from app.services.user_service import user_service

router = APIRouter()

class LoginReq(BaseModel):
    username: str
    password: str

class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class RefreshReq(BaseModel):
    refresh_token: str

class ChangePwdReq(BaseModel):
    old_password: str
    new_password: str

class AdminResetReq(BaseModel):
    username: str
    new_password: str

@router.post("/login", response_model=TokenPair)
def login(req: LoginReq, db: Session = Depends(get_db)):
    user = user_service.authenticate(db, username=req.username, password=req.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="用户已被禁用")

    access_token = create_access_token(
        data={"sub": user.username, "user_type": user.user_type},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token(data={"sub": user.username, "user_type": user.user_type})
    return TokenPair(access_token=access_token, refresh_token=refresh_token, expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

@router.post("/refresh", response_model=TokenPair)
def refresh(req: RefreshReq, db: Session = Depends(get_db)):
    from jose import jwt, JWTError
    try:
        payload = jwt.decode(req.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌类型错误")
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌无效")
        user = user_service.get_by_username(db, username)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌无效")

    access_token = create_access_token(data={"sub": user.username, "user_type": user.user_type})
    new_refresh = create_refresh_token(data={"sub": user.username, "user_type": user.user_type})
    return TokenPair(access_token=access_token, refresh_token=new_refresh, expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

@router.get("/profile")
def profile(current_user = Depends(get_current_user)):
    return {
        "id": getattr(current_user, "user_id", None),
        "username": current_user.username,
        "user_type": current_user.user_type,
        "is_active": current_user.is_active,
    }

@router.post("/change-password")
def change_password(req: ChangePwdReq, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    ok = user_service.change_password(db, current_user, req.old_password, req.new_password)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="原密码不正确或修改失败")
    return {"message": "密码已更新"}

from app.api.deps import require_admin

@router.post("/admin/reset-password")
def admin_reset_password(req: AdminResetReq, admin_user = Depends(require_admin), db: Session = Depends(get_db)):
    target = user_service.get_by_username(db, req.username)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="目标用户不存在")
    ok = user_service.admin_reset_password(db, target, req.new_password)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="重置失败")
    return {"message": "密码已重置", "username": target.username}
