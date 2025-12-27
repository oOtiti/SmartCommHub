import asyncio
import json
import os

import websockets
import paho.mqtt.client as mqtt

WS_URI = os.getenv("SCH_WS_URI", "ws://127.0.0.1:8000/ws/warning")
TOPIC = os.getenv("SCH_MQTT_TOPIC", "smartcommhub/health")
BROKER_HOST = os.getenv("SCH_MQTT_HOST", "127.0.0.1")
BROKER_PORT = int(os.getenv("SCH_MQTT_PORT", "1883"))

async def main():
    async with websockets.connect(WS_URI) as ws:
        c = mqtt.Client()
        c.connect(BROKER_HOST, BROKER_PORT, 60)
        payload = {
            "elderly_id": 1,
            "monitor_type": "heart_rate",
            "monitor_value": 120,
            "monitor_time": "2025-12-26 18:00:00",
            "device_id": "demo",
        }
        c.publish(TOPIC, json.dumps(payload))
        c.disconnect()

        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=5)
            print("[DEMO] WS 收到：", msg)
            print("PASS")
        except asyncio.TimeoutError:
            print("FAIL: 超时未收到广播")

if __name__ == "__main__":
    asyncio.run(main())
