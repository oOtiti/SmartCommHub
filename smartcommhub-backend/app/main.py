from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.database import engine
from app.core.security import validate_security_config
from app.core.logging import logger
from app.api.api import api_router
from app.core.config import settings

# 订阅端与 WS 预警
from app.events.mqtt_consumer import start_consumer
from app.events.access_consumer import start_access_consumer
from app.api.v1.ws import router as ws_router, start_broadcast_loop

app = FastAPI(title="SmartCommHub Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

@app.on_event("startup")
async def on_startup():
    # 校验安全配置（Fernet 密钥格式）
    validate_security_config()
    # 轻量 DB 探活
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Startup DB ping OK")
    except AssertionError as e:
        # openGauss 的版本字符串可能导致 SQLAlchemy 解析失败，这里仅记录并继续启动
        logger.warning(f"Startup DB ping skipped due to dialect init: {e}")
    except Exception as e:
        # 其他错误仍需暴露，避免掩盖真实故障
        logger.exception(f"Startup DB ping failed: {e}")
        raise

    # 启动 WS 广播后台任务（协程）
    await start_broadcast_loop()
    # 启动 MQTT 订阅端（线程）
    if settings.MQTT_ENABLED:
        start_consumer()
        start_access_consumer()

app.include_router(api_router, prefix="/api")
app.include_router(ws_router, prefix="")  # /ws/warning

@app.get("/api/healthz")
def healthz():
    return {"ok": True}
