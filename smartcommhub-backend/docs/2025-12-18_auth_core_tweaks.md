# 20251218_auth_core_tweaks

## 1. 增量工作简介
- 完成核心微调：安全模块修复（Fernet 与 JWT）、数据库引擎统一（openGauss 参数与连接事件）、固定依赖版本。
- 实现认证接口：POST /api/auth/login、POST /api/auth/refresh、GET /api/auth/profile。
- 新增基础组件：`app/models/base.py`、`app/models/user.py`、`app/services/user_service.py`、`app/api/deps.py`、`app/api/v1/auth.py`、`app/api/api.py`、`app/main.py`。

## 2. BUG 原因与表现（如有）
- `app/core/security.py` 中存在以下问题：
  - 错误的导入 `from app.core.config.py import settings`；
  - `CryptContext` 参数拼写错误（`shceme`），导致密码校验异常；
  - `create_refresh_token` 参数类型错误（使用 `str` 且 `copy()`）；
  - 未对 Fernet 密钥进行格式校验可能在运行期报错。

## 3. 功能解释与使用
- 认证接口：
  - 登录：`POST /api/auth/login`
    - 请求：`{ "username": "admin", "password": "Admin@123" }`
    - 响应：`{ access_token, refresh_token, token_type: "bearer", expires_in }`
  - 刷新：`POST /api/auth/refresh`
    - 请求：`{ "refresh_token": "..." }`
    - 响应：`{ access_token, refresh_token, token_type, expires_in }`
  - 当前用户：`GET /api/auth/profile`
    - 头：`Authorization: Bearer <access_token>`
    - 响应：`{ id, username, user_type, is_active }`

## 4. 核心做法与使用说明
- openGauss 连接：通过 `postgresql+psycopg2` 方言使用 SQLAlchemy 2.x；在 `app/core/database.py` 中统一连接池参数，并在 `connect` 事件中设置 `CLIENT_ENCODING` 与 `search_path`。
- 安全：`app/core/security.py` 提供密码哈希与校验、Fernet 加密/解密、JWT 生成；在应用启动时校验 Fernet 密钥格式。
- 路由：`app/api/v1/auth.py` 提供认证接口；`app/api/deps.py` 用于解析 Bearer Token 并加载当前用户。
- 应用入口：`app/main.py` 注册路由，添加 CORS，中启动时做 DB 探活与安全校验。

### 相关命令
```bash
# 安装依赖
pip install -r requirements.txt

# 启动后端
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 示例：插入管理员（需已有 sys_user 表）
python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('Admin@123'))"
# 将哈希插入到 sys_user 表中（username=admin, user_type=4）
```

## 5. Q&A
- Q：openGauss 为什么用 PostgreSQL 方言？
  - A：openGauss 协议兼容 PostgreSQL，`psycopg2` 在生态与稳定性上更成熟，适合当前场景。
- Q：Fernet 密钥如何生成？
  - A：使用 `from cryptography.fernet import Fernet; Fernet.generate_key()` 生成 URL-safe base64 的 32 字节密钥，并填入 `.env` 的 `ENCRYPTION_KEY`。
- Q：`sys_user` 表尚未初始化怎么办？
  - A：后续迁移将提供 DDL；当前认证接口依赖此表存在与数据准备。

## 6. 其他补充
- 依赖版本已固定在 `requirements.txt` 以确保团队一致性。
- 建议在后续版本加入 Alembic 迁移与 RBAC 角色表，满足社区管理端的权限要求。
- 反复遇到路径问题，应该要将项目根加入环境变量中：
```bash
echo 'export PYTHONPATH=/home/droot/dbSmartSys4Old/SmartCommHub/smartcommhub-backend' >> ~/.bashrc
source ~/.bashrc
```
