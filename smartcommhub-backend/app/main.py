from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.database import engine
from app.core.security import validate_security_config
from app.core.logging import logger
from app.api.api import api_router

app = FastAPI(title="SmartCommHub Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

@app.on_event("startup")
def on_startup():
    # 校验安全配置（Fernet 密钥格式）
    validate_security_config()
    # 轻量 DB 探活
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Startup DB ping OK")
    except Exception as e:
        logger.exception(f"Startup DB ping failed: {e}")
        raise

app.include_router(api_router, prefix="/api")

@app.get("/api/healthz")
def healthz():
    return {"ok": True}
