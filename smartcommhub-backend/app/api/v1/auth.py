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

# 管理员创建用户
class AdminCreateUserReq(BaseModel):
    username: str
    password: str
    # 0=管理员, 1=老人, 2=家属, 3=服务商（兼容 0/4 作为管理员）
    user_type: int = 2
    phone: str | None = None
    is_active: bool = True
    elderly_id: int | None = None
    family_id: int | None = None
    provider_id: int | None = None

class AdminCreateUserResp(BaseModel):
    id: int
    username: str
    user_type: int
    is_active: bool
    phone: str | None = None

@router.post("/admin/create-user", response_model=AdminCreateUserResp, status_code=status.HTTP_201_CREATED)
def admin_create_user(req: AdminCreateUserReq, admin_user = Depends(require_admin), db: Session = Depends(get_db)):
    # 仅允许管理员创建服务商账号；禁止创建管理员与家庭/老人（这两类请使用公开注册）
    if req.user_type in (0, 4):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不允许创建管理员账户")
    if req.user_type in (1, 2):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="家庭/老人请使用 /api/auth/register 自助注册")
    if req.user_type != 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仅支持创建服务商账户(user_type=3)")
    # 唯一性校验
    existed = user_service.get_by_username(db, req.username)
    if existed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="用户名已存在")
    if req.phone:
        from app.dao.user_dao import user_dao
        if user_dao.get_by_phone(db, req.phone):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="手机号已存在")

    user = user_service.create_user(
        db,
        username=req.username,
        password=req.password,
        user_type=req.user_type,
        is_active=req.is_active,
        phone=req.phone,
        elderly_id=req.elderly_id,
        family_id=req.family_id,
        provider_id=req.provider_id,
    )
    return AdminCreateUserResp(
        id=int(user.user_id),
        username=user.username,
        user_type=int(user.user_type),
        is_active=bool(user.is_active),
        phone=getattr(user, "phone", None),
    )

# 公开注册：家庭/老人
class RegisterReq(BaseModel):
    username: str
    password: str
    # 允许 1(老人) 或 2(家属)，默认 2
    user_type: int = 2
    phone: str
    elderly_id: int | None = None
    family_id: int | None = None

class RegisterResp(BaseModel):
    id: int
    username: str
    user_type: int
    is_active: bool
    phone: str | None = None

@router.post("/register", response_model=RegisterResp, status_code=status.HTTP_201_CREATED)
def register(req: RegisterReq, db: Session = Depends(get_db)):
    # 类型限制：仅允许 1/2；禁止 0/4 管理员与 3 服务商
    if req.user_type in (0, 4):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不允许注册管理员账户")
    if req.user_type not in (1, 2):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仅支持注册老人(1)/家属(2)账号")

    # 唯一性（用户名、手机号必填并唯一）
    existed = user_service.get_by_username(db, req.username)
    if existed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="用户名已存在")
    from app.dao.user_dao import user_dao
    if user_dao.get_by_phone(db, req.phone):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="手机号已存在")

    user = user_service.create_user(
        db,
        username=req.username,
        password=req.password,
        user_type=req.user_type,
        is_active=True,
        phone=req.phone,
        elderly_id=req.elderly_id,
        family_id=req.family_id,
    )
    return RegisterResp(
        id=int(user.user_id),
        username=user.username,
        user_type=int(user.user_type),
        is_active=bool(user.is_active),
        phone=getattr(user, "phone", None),
    )

# 个人资料更新（当前支持：phone）
class ProfileUpdateReq(BaseModel):
    phone: str | None = None

@router.patch("/profile")
def update_profile(req: ProfileUpdateReq, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    from sqlalchemy import select
    from app.models.user import User
    # 更新手机号
    if req.phone:
        # 检查其他用户是否占用该手机号
        dup = db.execute(
            select(User).where(User.phone == req.phone, User.user_id != current_user.user_id).limit(1)
        ).scalar_one_or_none()
        if dup:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="手机号已存在")
        try:
            current_user.phone = req.phone
            db.add(current_user)
            db.commit()
            db.refresh(current_user)
        except Exception:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="资料更新失败")

    return {
        "id": getattr(current_user, "user_id", None),
        "username": current_user.username,
        "user_type": current_user.user_type,
        "is_active": current_user.is_active,
        "phone": getattr(current_user, "phone", None),
    }

# 忘记密码：请求验证码（演示版，任何手机号都返回成功，实际应调用短信服务）
class ForgotReq(BaseModel):
    phone: str

@router.post("/forgot/request")
def forgot_request(req: ForgotReq):
    # 演示：无论手机号是否存在都返回成功，避免暴露用户信息
    return {"message": "验证码已发送（演示环境，任意输入均视为通过）"}

# 忘记密码：重置密码（演示版，验证码任意值均通过）
class ForgotResetReq(BaseModel):
    phone: str
    code: str
    new_password: str

@router.post("/forgot/reset")
def forgot_reset(req: ForgotResetReq, db: Session = Depends(get_db)):
    from app.dao.user_dao import user_dao
    user = user_dao.get_by_phone(db, req.phone)
    if not user:
        # 演示版：为了避免枚举手机号，仍返回 200，但不做任何修改；若需严格返回 404，请取消注释
        # raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="手机号未绑定账户")
        return {"message": "重置成功（演示环境，未找到账户不修改）"}
    ok = user_service.admin_reset_password(db, user, req.new_password)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="重置失败")
    return {"message": "密码已重置", "username": user.username}
