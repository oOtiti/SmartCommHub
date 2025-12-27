# 2025-12-18 增量：密码API与批量账户脚本

## 说明
- 对齐用户模型为表 `sys_usr_account`，新增字段：`phone`、`failed_attempts`、`locked_until`、`last_login_at`、`pwd_changed_at`、`elderly_id`、`family_id`、`provider_id`。
- 新增密码相关接口：
  - POST `/api/auth/change-password`：当前用户修改密码。
  - POST `/api/auth/admin/reset-password`：管理员为指定用户名重置密码。
- 新增批量创建账户脚本 `scripts/bulk_create_accounts.py`：
  - 扫描 `elderly`、`family_member`、`provider`，为缺失账户生成账号与随机密码（hash入库），明文输出到 `scripts/resouse/usr_key_abstract.txt`。

## 变更明细
- `app/models/user.py`：对齐为 `sys_usr_account`，字段与数据库快照一致。
- `app/dao/user_dao.py`：新增 `get_by_phone`、`get_by_id`、`update_password`、`set_last_login`、`incr_failed_attempts`。
- `app/services/user_service.py`：
  - 登录成功/失败计数更新；
  - `change_password()` 与 `admin_reset_password()` 实现；
  - `create_user()` 支持额外绑定字段。
- `app/api/deps.py`：新增 `require_admin` 依赖，允许 `user_type` 为 0 或 4 视为管理员。
- `app/api/v1/auth.py`：
  - `profile` 返回 `user_id`；
  - 新增 `POST /change-password` 与 `POST /admin/reset-password`。
- `scripts/bulk_create_accounts.py`：
  - 用户名规则：`eld_{elderly_id}` / `fam_{family_id}` / `pro_{provider_id}`；
  - `user_type`：1=老人，2=家属，3=服务商（如库内定义不同请调整）；
  - `phone` 唯一性冲突时置空。

## 使用
- 修改密码
```
curl -X POST http://127.0.0.1:8000/api/auth/change-password \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"old_password":"OLD","new_password":"NEW"}'
```
- 管理员重置密码
```
curl -X POST http://127.0.0.1:8000/api/auth/admin/reset-password \
  -H 'Authorization: Bearer <ACCESS_TOKEN_OF_ADMIN>' \
  -H 'Content-Type: application/json' \
  -d '{"username":"target_user","new_password":"New#Pass123"}'
```
- 批量创建账户脚本
```
cd smartcommhub-backend
PYTHONPATH=. python3 scripts/bulk_create_accounts.py
```
输出文件：`scripts/resouse/usr_key_abstract.txt`

## 注意
- 管理员判定：`user_type in (0,4)`，如库内使用其他值，请在 `app/api/deps.py::require_admin` 中调整。
- 如需按手机号登录，可在 `UserService.authenticate` 中增加按 `phone` 查找逻辑。
