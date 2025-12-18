import sys
from sqlalchemy import create_engine, text
from sqlalchemy.pool import QueuePool
from app.core.config import settings
from app.core.logging import logger
from sqlalchemy.engine import make_url

def log_dsn():
    u = make_url(settings.DATABASE_URL)
    safe_user = (u.username) if u.username else None
    logger.info(f"DSN: driver={u.drivername} host={u.host} port={u.port} db={u.database} user={safe_user}")

def main() -> int:
    logger.info("开始数据库连接测试")
    log_dsn()
    try:
        engine = create_engine(
            settings.DATABASE_URL,
            poolclass=QueuePool,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_timeout=settings.DB_POOL_TIMEOUT,
            pool_recycle=settings.DB_POOL_RECYCLE,
            pool_pre_ping=True,
            echo=settings.DB_ECHO_POOL,
            future=True,
        )
        with engine.connect() as conn:
            # 设置编码与 schema（openGauss 兼容）
            conn.exec_driver_sql(f"SET CLIENT_ENCODING TO '{settings.DB_CLIENT_ENCODING}'")
            conn.exec_driver_sql(f"SET search_path TO {settings.DB_SEARCH_PATH}")
            # 基本探活
            result = conn.execute(text("SELECT 1")).scalar_one()
            logger.info(f"探活结果: {result}")
        logger.info("数据库连接测试通过")
        return 0
    except Exception as e:
        logger.exception(f"数据库连接测试失败: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())

'''通过样例
(pyt4cls) droot@mwhx:~/dbSmartSys4Old/SmartCommHub$ python /home/droot/dbSmartSys4Old/SmartCommHub/smartcommhub-backend/tests/db_con_ck.py
[2025-12-19 00:25:54,213] INFO smartcommhub: 开始数据库连接测试
[2025-12-19 00:25:54,214] INFO smartcommhub: DSN: driver=opengauss+psycopg2 host=8.134.151.27 port=15432 db=community_elderly_care user=user
[2025-12-19 00:25:54,416] INFO smartcommhub: 探活结果: 1
[2025-12-19 00:25:54,425] INFO smartcommhub: 数据库连接测试通过
(pyt4cls) droot@mwhx:~/dbSmartSys4Old/SmartCommHub$ 
'''