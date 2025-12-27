# -*- coding: utf-8 -*-
"""
MQTT 订阅端（最小可用实现）
- 功能：订阅健康数据主题，做边缘侧基础校验与异常判别（可由你改进算法），入库并触发 WS 预警。
- 依赖：paho-mqtt（requirements.txt 已添加）。

消息格式（JSON）：
{
  "elderly_id": 123,                 # 老人ID（必填，外键）
  "monitor_type": "heart_rate",     # heart_rate | blood_pressure（必填）
  "monitor_value": 98.0,             # 数值（必填）
  "monitor_time": "2025-12-23 12:01:02",  # 时间（必填，YYYY-MM-DD HH:MM:SS）
  "device_id": "mock_device_001"    # 设备ID（可选）
}

可改进的核心算法（由你优化）：
- is_abnormal 的判定策略：当前是简单阈值法（心率>100，血压>140）。建议引入滑动窗口与异常检测（如季节性阈值、多变量规则或轻量模型前置）。
- 质量校验：可加入设备校准、字段异常纠正、时间回拨/重复检测等。
"""
from __future__ import annotations
import json
import queue
import threading
from typing import Any, Dict

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logging import logger
from app.models.health_record import HealthRecord
from app.models.elderly import Elderly
from sqlalchemy import select
from app.services.edge.anomaly import anomaly_engine

# 跨线程缓冲队列（MQTT 线程 -> DB 工作线程）
MSG_Q: "queue.Queue[Dict[str, Any]]" = queue.Queue(maxsize=settings.MQTT_QUEUE_MAXSIZE)


def _value_valid(mt: str, v: float) -> bool:
    # 基础范围校验（防脏数据）
    if mt == "heart_rate":
        return 0 <= v <= 220
    if mt == "blood_pressure":
        return 50 <= v <= 260
    return False


def _is_abnormal(mt: str, v: float) -> int:
    # 可由你改进的核心算法：阈值 -> 滑窗/分位/小模型
    if mt == "heart_rate":
        return 1 if v > 100 else 0
    if mt == "blood_pressure":
        return 1 if v > 140 else 0
    return 0


def _worker_db_and_ws():
    # 后台工作线程：入库并触发 WS 预警
    # 注意：从线程里调用 WS 广播（异步）需通过队列桥接，ws 模块提供 push_warning()
    from app.api.v1.ws import push_warning  # 延迟导入，避免循环依赖

    while True:
        item = MSG_Q.get()
        try:
            wrote = False
            try:
                with SessionLocal() as db:
                    # 验证外键是否存在，避免违反约束导致回滚
                    elder = db.get(Elderly, item["elderly_id"])  # SQLAlchemy 2.0 API
                    if elder is None:
                        logger.warning(
                            f"健康记录入库跳过：elderly_id={item['elderly_id']} 不存在（仅广播异常，不写库）"
                        )
                    else:
                        rec = HealthRecord(
                            elderly_id=item["elderly_id"],
                            monitor_type=item["monitor_type"],
                            monitor_value=item["monitor_value"],
                            monitor_time=item["monitor_time"],
                            is_abnormal=item["is_abnormal"],
                            device_id=item.get("device_id", "mock_device_001"),
                        )
                        db.add(rec)
                        db.commit()
                        wrote = True
            except AssertionError as e:
                # openGauss 方言初始化可能因版本串导致断言失败
                logger.warning(f"DB dialect init failed: {e}")
            except Exception as e:
                logger.exception(f"DB写入失败：{e}")

            # 触发 WS 预警（携带个性化异常信息；全局异常时广播）
            # 计算个性化评分（无论是否全局异常，均更新基线；仅在全局异常或个人化异常时广播）
            personal = None
            try:
                if settings.ANOMALY_PERSONAL_ENABLED:
                    key = (
                        int(item["elderly_id"]),
                        str(item.get("device_id", "mock_device_001")),
                        str(item["monitor_type"]),
                    )
                    personal = anomaly_engine.update_and_score(key, float(item["monitor_value"]))
            except Exception:
                personal = None

            should_broadcast = bool(item["is_abnormal"]) or bool(personal and personal.get("personal_abnormal"))
            if should_broadcast:
                # 持久化告警
                try:
                    from app.models.alert import Alert
                    with SessionLocal() as db:
                        alert = Alert(
                            elderly_id=int(item["elderly_id"]),
                            monitor_type=str(item["monitor_type"]),
                            monitor_value=float(item["monitor_value"]),
                            monitor_time=str(item["monitor_time"]),
                            device_id=str(item.get("device_id", "mock_device_001")),
                            global_abnormal=int(item["is_abnormal"]),
                            personal_abnormal=int(1 if (personal and personal.get("personal_abnormal")) else 0),
                            score=(personal.get("score") if personal else None),
                            confidence=(personal.get("confidence") if personal else None),
                            k=(personal.get("k") if personal else None),
                            n=(personal.get("n") if personal else None),
                            mu=(personal.get("mu") if personal else None),
                            sigma=(personal.get("sigma") if personal else None),
                            ack_status="UNACKED",
                        )
                        db.add(alert)
                        db.commit()
                except Exception as e:
                    logger.warning(f"告警持久化失败：{e}")

                try:
                    push_warning({
                        "elderly_id": item["elderly_id"],
                        "monitor_type": item["monitor_type"],
                        "monitor_value": item["monitor_value"],
                        "monitor_time": str(item["monitor_time"]),
                        "device_id": item.get("device_id", "mock_device_001"),
                        "db_written": wrote,
                        "anomaly": {
                            "global": bool(item["is_abnormal"]),
                            **({
                                "personal": bool(personal.get("personal_abnormal")),
                                "score": personal.get("score"),
                                "confidence": personal.get("confidence"),
                                "k": personal.get("k"),
                                "n": personal.get("n"),
                                "mu": personal.get("mu"),
                                "sigma": personal.get("sigma"),
                            } if personal else {})
                        },
                    })
                except Exception as e:
                    logger.exception(f"WS 广播失败：{e}")
        finally:
            MSG_Q.task_done()


# MQTT 回调

def _on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode("utf-8"))
        # 字段校验（最小必需）
        if not all(k in data for k in ("elderly_id", "monitor_type", "monitor_value", "monitor_time")):
            logger.debug("MQTT消息忽略：缺少必需字段")
            return
        mt = str(data["monitor_type"]).strip()
        try:
            mv = float(data["monitor_value"])  # 转为 float
        except Exception:
            logger.debug("MQTT消息忽略：monitor_value 无法转换为 float")
            return
        if not _value_valid(mt, mv):
            logger.debug("MQTT消息忽略：数值超出有效范围")
            return
        data["monitor_value"] = mv
        data["is_abnormal"] = _is_abnormal(mt, mv)
        # 推入队列给后台线程
        try:
            MSG_Q.put_nowait(data)
        except Exception as e:
            logger.warning(f"MQTT消息入队失败：{e}")
    except Exception as e:
        # 忽略单条异常消息，避免阻塞
        logger.debug(f"MQTT消息解析异常：{e}")


def start_consumer():
    """
    启动 MQTT 订阅：
    - 后台 DB+WS 工作线程
    - MQTT 客户端 loop_forever 线程
    """
    # 工作线程
    threading.Thread(target=_worker_db_and_ws, name="mqtt-db-worker", daemon=True).start()

    # MQTT 客户端
    try:
        import paho.mqtt.client as mqtt  # 按需导入，避免缺依赖导致后端无法启动
    except Exception as e:
        logger.warning(f"MQTT未启用：缺少 paho-mqtt 依赖（{e}）")
        return
    c = mqtt.Client(client_id=settings.MQTT_CLIENT_ID, clean_session=True)
    c.on_message = _on_message
    try:
        c.connect(settings.MQTT_BROKER_URL, settings.MQTT_BROKER_PORT, keepalive=30)
        c.subscribe(settings.MQTT_TOPIC, qos=1)
        threading.Thread(target=c.loop_forever, name="mqtt-loop", daemon=True).start()
        logger.info(f"MQTT订阅已启动：tcp://{settings.MQTT_BROKER_URL}:{settings.MQTT_BROKER_PORT} topic={settings.MQTT_TOPIC}")
    except Exception as e:
        # Broker 未就绪时跳过，不阻断应用启动；可在 .env 里关闭 MQTT 或稍后重启
        logger.warning(f"MQTT未连接：{e}（启动不中断）")
        return
