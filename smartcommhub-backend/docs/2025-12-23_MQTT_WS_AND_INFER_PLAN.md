# 2025-12-23_MQTT_WS_AND_INFER_PLAN

- 增量简介
  - 新增后端 MQTT 订阅端（最小实现）：订阅健康数据主题，边缘预处理（必填校验/范围校验/异常判定）后入库，异常时通过 WS 广播预警。
  - 新增 WebSocket 预警端点：`/ws/warning`，客户端连接后可实时接收预警消息。
  - 代码均附中文注释，并标注了可由你改进的“核心算法”位置（异常判定策略、消息聚合/节流等）。

- 配置项（.env 可覆盖）
  - `MQTT_ENABLED`：是否启用订阅（默认 True）
  - `MQTT_BROKER_URL`：MQTT Broker 地址，默认 `127.0.0.1`
  - `MQTT_BROKER_PORT`：端口，默认 `1883`
  - `MQTT_TOPIC`：订阅主题，默认 `smartcommhub/health`
  - `MQTT_CLIENT_ID`：订阅端客户端ID，默认 `sch_backend_consumer`
  - `MQTT_QUEUE_MAXSIZE`：订阅消息缓冲队列上限，默认 `1000`

- 启动方法
  - 安装依赖（新增 `paho-mqtt`）：
    - `pip install -r smartcommhub-backend/requirements.txt`
  - 启动后端（示例）：
    - `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
  - 订阅端自动随应用启动；WS 广播后台任务也会自动启动。

- 主题规范与消息格式
  - 主题：`${MQTT_TOPIC}`（默认 `smartcommhub/health`）
  - 消息体（JSON）：
    ```json
    {
      "elderly_id": 123,
      "monitor_type": "heart_rate", // heart_rate | blood_pressure
      "monitor_value": 98.0,
      "monitor_time": "2025-12-23 12:01:02",
      "device_id": "mock_device_001"
    }
    ```
  - 入库表：`health_record`（字段对齐 ORM 模型）。

- 预警广播
  - WS 地址：`ws://<host>:<port>/ws/warning`
  - 客户端连接后将被动接收服务端推送的预警消息（JSON 同上，去除 is_abnormal 字段）。
  - 当前策略：逐条广播（200ms 批处理周期）。
  - 可改进（核心算法位置已标注）：聚合/节流、按社区/用户分组推送、补偿重发等。

- 数据透视与训练参数（计划）
  - 透视：最近 N 天数据，心率/血压合并为样本行；窗口=5，步长=1，加入时段/设备特征。
  - 弱标注：`is_abnormal = (heart_rate>100) OR (blood_pressure>140)`；可进一步引入多阈值与环境因子。
  - 训练（轻量版）：PatchTST + LoRA，`r=4, epochs=20, d_model=32, num_layers=2`（CPU 可跑，演示用）。
  - 推理接口（后续）：`POST /api/infer/abnormal`，返回异常概率，必要时回写 `health_record.is_abnormal`。

- Q&A
  - Q：Broker 未就绪时怎么办？
    - A：订阅端将尝试连接；如需确认连接状态，建议在应用日志/监控中查看；也可先关闭 `MQTT_ENABLED=False`。
  - Q：异常判定太简单？
    - A：已在代码注释标注“核心算法”位置，可替换为滑窗统计、分位阈值或轻量模型推断。

- 文件位置
  - 配置：`app/core/config.py`（新增 MQTT 配置项）
  - 订阅端：`app/events/mqtt_consumer.py`
  - 预警端：`app/api/v1/ws.py`（`/ws/warning`）
  - 启动接入：`app/main.py`（启动 WS 广播与 MQTT 订阅）
