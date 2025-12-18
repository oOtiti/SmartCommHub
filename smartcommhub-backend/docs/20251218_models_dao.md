# 20251218_models_dao

## 1. 增量工作简介
- 基于 `scripts/tbl_stru/schema_snapshot_public_20251218_175750.json` 校准并完成 ORM 模型与 DAO 数据访问层。
- 新增模型：elderly、provider、service_item、family_member、health_record、community_notice、service_order、access_record。
- 新增 DAO：BaseDAO、以及上述各表的具体 DAO，统一使用 SQLAlchemy 2.x 风格。

## 2. BUG 原因分析及其表现
- 早期模型字段与数据库实际结构不一致（类型、主键名、外键指向），可能导致查询/写入异常。
- 通过结构采集脚本获取真实结构后，按实际字段名与约束完成了模型对齐。

## 3. 功能解释与使用
- 模型位于 `app/models/*`，DAO 位于 `app/dao/*`：
  - `elderly_dao.search(db, keyword, page, size)`：分页按姓名模糊查询。
  - `provider_dao.get_by_qualification(db, qualification_id)`：按资质编号查服务商。
  - `service_item_dao.list_by_provider(db, provider_id, status)`：按服务商与状态列服务项。
  - `service_order_dao.list(db, elderly_id, status)`：按老人和状态列订单；`confirm/complete/rate` 状态与评分更新。
  - `family_member_dao.list_by_elderly(db, elderly_id)`：列某老人的家属。
  - `health_record_dao.list_by_filters(db, elderly_id, monitor_type, start, end)`：健康记录过滤。
  - `access_record_dao.list_by_filters(db, elderly_id, start, end, abnormal)`：进出记录过滤。
  - `community_notice_dao.list_by_target(db, target_group)`：按目标群体查询公告。

### 使用示例
```python
from sqlalchemy.orm import Session
from app.dao import elderly_dao, service_order_dao

# 分页查询老人
items, total = elderly_dao.search(db, keyword="张", page=1, size=20)

# 更新订单为已完成
rows = service_order_dao.complete(db, order_id=123)
if rows:
    db.commit()
```

## 4. 核心做法与命令
- 做法：严格按数据库快照生成模型字段与约束；DAO 使用 `select().scalars().all()`、`update().execution_options(synchronize_session='fetch')` 保持会话一致性；事务边界交由服务层控制。
- 相关命令：
```bash
# 采集表结构（已完成）
python scripts/DaraInsp.py --schema public

# 启动后端（如需验证接口）
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 5. Q&A
- Q：为什么 DAO 不自动 commit？
  - A：统一事务由服务层控制，便于多表写入的一致性；DAO 只负责执行与返回影响行数。
- Q：模型中是否加入 relationship？
  - A：当前按最简 FK 对齐。若需要 ORM 级联加载，可增设 `relationship` 并指定 `lazy` 策略。
- Q：`eval_score` 为什么设为 Integer 默认 0？
  - A：快照中类型为 NULL 且默认 0；为可评分字段，采取 `nullable=True + server_default 0` 以兼容初始化状态。

## 6. 其他特定补充（优化与抉择）
- 事务策略：保持 DAO 无事务，服务层按用例统一提交（推荐）。
- 加密策略：现表中身份证与联系方式为明文字段。若后续执行隐私加密，可在服务层写入前使用 `app/core/security.encrypt_sensitive_data` 并将密文写入数据库（需调整字段类型与长度）。
- 索引优化：建议在热点查询路径新增复合索引（如 `service_order(elderly_id, order_status)`、`health_record(elderly_id, monitor_time)`）。后续通过 Alembic 迁移脚本追加。
