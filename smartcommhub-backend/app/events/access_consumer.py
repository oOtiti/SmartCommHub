# -*- coding: utf-8 -*-
"""
门禁进出订阅端（最小实现）
- 功能：订阅门禁主题，写入 access_record，并进行个性化“外出时长/未出门”异常判别。
- 推送：通过 WS 广播与 alerts 持久化。
"""
from __future__ import annotations
import json
import threading
import time
from datetime import datetime

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logging import logger
from app.models.access_record import AccessRecord
from app.services.edge.access_anomaly import access_anomaly_engine


def _parse_time(s: str) -> datetime:
    try:
        # 兼容 "YYYY-MM-DD HH:MM:SS"
        return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
    except Exception:
        # 尝试 ISO8601
        try:
            return datetime.fromisoformat(s)
        except Exception:
            return datetime.utcnow()


def _worker_periodic_check():
    # 周期检查：未归/未出门
    from app.api.v1.ws import push_warning
    from app.models.alert import Alert
    while True:
        try:
            now = datetime.utcnow()
            to_warn = access_anomaly_engine.check_timeouts(now)
            for ev in to_warn:
                try:
                    # 落库 alerts
                    with SessionLocal() as db:
                        alert = Alert(
                            elderly_id=int(ev["elderly_id"]),
                            monitor_type=str(ev["type"]),
                            monitor_value=float(ev.get("duration_hours", ev.get("interval_hours", 0.0)) or 0.0),
                            monitor_time=now,
                            device_id="gate",
                            global_abnormal=0,
                            personal_abnormal=1,
                            score=ev.get("score"),
                            confidence=None,
                            k=ev.get("k"),
                            n=ev.get("n"),
                            mu=ev.get("mu"),
                            sigma=ev.get("sigma"),
                            ack_status="UNACKED",
                        )
                        db.add(alert)
                        db.commit()
                    # WS 广播
                    payload = {
                        "elderly_id": ev["elderly_id"],
                        "monitor_type": ev["type"],
                        "monitor_value": ev.get("duration_hours", ev.get("interval_hours", 0.0)),
                        "monitor_time": now.isoformat(),
                        "device_id": "gate",
                        "db_written": False,
                        "anomaly": {
                            "global": False,
                            "personal": True,
                            "score": ev.get("score"),
                            "confidence": None,
                            "k": settings.ACCESS_K_SIGMA,
                            "n": ev.get("n"),
                            "mu": ev.get("mu"),
                            "sigma": ev.get("sigma"),
                        },
                    }
                    push_warning(payload)
                except Exception as e:
                    logger.warning(f"门禁周期告警失败：{e}")
        except Exception:
            pass
        time.sleep(settings.ACCESS_CHECK_INTERVAL_SECONDS)


def _on_message(client, userdata, msg):
    from app.api.v1.ws import push_warning
    try:
        data = json.loads(msg.payload.decode("utf-8"))
        # 需要字段：elderly_id, access_type(IN/OUT), record_time, gate_location
        if not all(k in data for k in ("elderly_id", "access_type", "record_time", "gate_location")):
            logger.debug("门禁消息忽略：缺少必需字段")
            return
        elderly_id = int(data["elderly_id"])
        access_type = str(data["access_type"]).upper()
        record_time = _parse_time(str(data["record_time"]))
        gate_location = str(data["gate_location"]) or ""
        if access_type not in ("IN", "OUT"):
            logger.debug("门禁消息忽略：access_type 非 IN/OUT")
            return
        # 入库 access_record（是否标记 is_abnormal 由业务定义；此处统一为 NO）
        try:
            with SessionLocal() as db:
                rec = AccessRecord(
                    elderly_id=elderly_id,
                    access_type=access_type,
                    record_time=record_time,
                    gate_location=gate_location,
                    is_abnormal="NO",
                )
                db.add(rec)
                db.commit()
        except Exception as e:
            logger.warning(f"门禁记录入库失败：{e}")
        # 更新个性化引擎与告警
        try:
            if access_type == "OUT":
                access_anomaly_engine.on_out(elderly_id, record_time)
            else:
                ev = access_anomaly_engine.on_in(elderly_id, record_time)
                if ev and ev.get("personal_abnormal"):
                    # 落库 alerts
                    try:
                        from app.models.alert import Alert
                        with SessionLocal() as db:
                            alert = Alert(
                                elderly_id=elderly_id,
                                monitor_type=str(ev["type"]),
                                monitor_value=float(ev["duration_hours"]),
                                monitor_time=record_time,
                                device_id="gate",
                                global_abnormal=0,
                                personal_abnormal=1,
                                score=ev.get("score"),
                                confidence=None,
                                k=settings.ACCESS_K_SIGMA,
                                n=ev.get("n"),
                                mu=ev.get("mu"),
                                sigma=ev.get("sigma"),
                                ack_status="UNACKED",
                            )
                            db.add(alert)
                            db.commit()
                    except Exception as e:
                        logger.warning(f"门禁告警持久化失败：{e}")
                    # WS 广播
                    payload = {
                        "elderly_id": elderly_id,
                        "monitor_type": ev["type"],
                        "monitor_value": ev["duration_hours"],
                        "monitor_time": record_time.isoformat(),
                        "device_id": "gate",
                        "db_written": False,
                        "anomaly": {
                            "global": False,
                            "personal": True,
                            "score": ev.get("score"),
                            "confidence": None,
                            "k": settings.ACCESS_K_SIGMA,
                            "n": ev.get("n"),
                            "mu": ev.get("mu"),
                            "sigma": ev.get("sigma"),
                        },
                    }
                    push_warning(payload)
        except Exception as e:
            logger.warning(f"门禁个性化计算失败：{e}")
    except Exception as e:
        logger.debug(f"门禁消息解析异常：{e}")


def start_access_consumer():
    # 周期检查线程
    threading.Thread(target=_worker_periodic_check, name="access-periodic", daemon=True).start()

    # MQTT 客户端订阅门禁主题
    try:
        import paho.mqtt.client as mqtt
    except Exception as e:
        logger.warning(f"MQTT未启用：缺少 paho-mqtt 依赖（{e}）")
        return
    c = mqtt.Client(client_id=f"{settings.MQTT_CLIENT_ID}_access", clean_session=True)
    c.on_message = _on_message
    try:
        c.connect(settings.MQTT_BROKER_URL, settings.MQTT_BROKER_PORT, keepalive=30)
        c.subscribe(settings.MQTT_ACCESS_TOPIC, qos=1)
        threading.Thread(target=c.loop_forever, name="mqtt-access-loop", daemon=True).start()
        logger.info(f"门禁订阅启动：tcp://{settings.MQTT_BROKER_URL}:{settings.MQTT_BROKER_PORT} topic={settings.MQTT_ACCESS_TOPIC}")
    except Exception as e:
        logger.warning(f"门禁MQTT未连接：{e}（启动不中断）")
        return
