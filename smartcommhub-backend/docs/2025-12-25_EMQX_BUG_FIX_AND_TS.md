# EMQX 边缘计算联调增量记录（BUG 修复与展示指南）

日期：2025-12-26

## 背景与目标
- 目标：打通 MQTT→后端订阅→边缘判定→入库→WS 广播的演示链路。
- 环境：EMQX（1883）、FastAPI 后端（/ws/warning）、openGauss 数据库。

## 问题一：SQLAlchemy 方言初始化失败（openGauss 版本串）
- 现象：后端首次建连时抛出 `AssertionError: Could not determine version from string 'openGauss ...'`，导致线程退出，链路中断。
- 根因：SQLAlchemy 的 PostgreSQL 方言在初始化阶段需解析 `select version()`；openGauss 的版本字符串不符合其预期格式。
- 修复：
  - 在 `app/core/database.py` 中新增两个事件：
    - `first_connect`：猴补 `dialect._get_server_version_info()`，解析 `openGauss x.y.z` 或兜底返回 `(14,0)`。
    - `connect`：查询 `select version()` 并为 DBAPI 连接填充 `server_version`（若缺失），避免断言。
- 结果：启动探活通过，线程不再崩溃，后续 DB 操作可继续。

## 问题二：健康记录入库外键冲突（elderly_id 不存在）
- 现象：`IntegrityError: ForeignKeyViolation`，写入 `health_record` 时引用的 `elderly(elderly_id)` 不存在，导致事务回滚。
- 根因：演示发布的样例使用 `elderly_id=1`，而当前数据库并无对应老人数据（`elderly` 表必填字段较多，未预置）。
- 调整策略：
  - 在 `app/events/mqtt_consumer.py` 的后台入库线程中，先用 `db.get(Elderly, elderly_id)` 验证外键是否存在；不存在则**跳过入库**但继续进行异常广播，便于演示联调。
  - 广播 payload 增加 `db_written` 标识（true/false），帮助辨识是否入库成功。
- 备注：如需真实入库，需先创建老人信息（`elderly` 表必填：`name,id_card,age,health_level,emergency_contact,address`）。

## 关键概念与流程示意
- 主题：`smartcommhub/health`
- 消息格式（JSON）：
  ```json
  {
    "elderly_id": 123,
    "monitor_type": "heart_rate | blood_pressure",
    "monitor_value": 98.0,
    "monitor_time": "YYYY-MM-DD HH:MM:SS",
    "device_id": "mock_device_001"
  }
  ```
- 边缘判定：
  - `heart_rate > 100` → `is_abnormal = 1`
  - `blood_pressure > 140` → `is_abnormal = 1`
  - 可按需升级为滑窗/分位/小模型等。
- 处理链路：
  1. EMQX 收到客户端发布的健康数据。
  2. 后端 paho-mqtt 订阅回调 `_on_message` 解析与校验，计算 `is_abnormal`，推送到队列。
  3. 后台线程 `_worker_db_and_ws`：
     - 尝试写入 `health_record`（若 `elderly_id` 存在）。
     - 若 `is_abnormal=1`，调用 `push_warning()` 向 `/ws/warning` 广播；入库失败也会广播（演示优先）。
  4. 前端或 `wscat` 连接 WebSocket，实时接收预警。

## 展示流程指导（重要）
1. 启动后端：
   ```bash
   cd ~/dbSmartSys4Old/SmartCommHub
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. 准备客户端：
   - WebSocket：
     ```bash
     p
     ```
   - MQTT 发布（任选其一）：
     - 命令行：
       ```bash
       mosquitto_pub -h 127.0.0.1 -p 1883 -t smartcommhub/health \
         -m '{"elderly_id":1,"monitor_type":"heart_rate","monitor_value":120,"monitor_time":"2025-12-26 18:00:00","device_id":"demo"}'
       ```
     - 演示脚本：
       ```bash
       cd ~/dbSmartSys4Old/SmartCommHub/smartcommhub-backend
       python -m pip install -U paho-mqtt websockets
       python tests/mqtt_ws_demo.py
       ```
3. 观察结果：
   - `wscat` 应收到一条预警消息，包含 `monitor_type/monitor_value` 及 `db_written`。
   - 若 `db_written=false`：说明演示用 `elderly_id` 不存在，仅广播不入库；创建老人数据后即可入库（见下文）。

## 数据准备（要做真实入库）
- 通过 API 或 SQL 先插入一条老人信息，例如：
  ```sql
  INSERT INTO elderly (name, id_card, age, health_level, emergency_contact, address)
  VALUES ('演示老人', '123456789012345678', 75, 'A', '13800000000', '演示地址');
  -- 记下生成的 elderly_id，用于后续 MQTT 消息的 elderly_id
  ```
- 或在后端管理界面/API 里新增老人，再用该 `elderly_id` 发布 MQTT 消息，即可看到 `db_written=true`。

## 后续优化建议
- 在 `settings` 中加开关：演示模式下允许“无老人也广播”，生产模式严格校验并写库失败时报警。
- 引入轻量异常检测模型（如移动窗口 + IQR/分位）提升误报/漏报表现。
- 若长期使用 openGauss，考虑引入官方 SQLAlchemy 方言插件 `sqlalchemy-opengauss` 并将 `DATABASE_URL` 改为 `opengauss+psycopg2://...`。

## 变更点摘要
- `app/core/database.py`
  - 新增 `first_connect` 与 `connect` 事件，兼容 openGauss 版本解析与 `server_version`。
- `app/events/mqtt_consumer.py`
  - 入库前校验 `elderly_id` 是否存在；缺失则跳过入库但仍广播异常。
  - 广播 payload 增加 `db_written` 标识。

---
如需我再补自动创建“演示老人”的脚本或 API，请告诉我你的需求（字段取值规范、是否批量）。
