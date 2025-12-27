# app/core/db.py
from sqlalchemy import create_engine, event
import re
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session as SqlAlchemySession
from sqlalchemy.pool import QueuePool
from typing import Iterator
from app.core.config import settings

##如果后续只读压力大，或者做了只读从库，可以做读写引擎分离

def _normalize_url(url: str) -> str:
    """兼容 openGauss：统一转换为 postgresql+psycopg2，让 SQLAlchemy 能正确加载驱动。
    注意：不影响连接协议，openGauss 兼容 PostgreSQL 协议。
    """
    if url.startswith("opengauss+psycopg2://"):
        return url.replace("opengauss+psycopg2://", "postgresql+psycopg2://", 1)
    if url.startswith("opengauss://"):
        return url.replace("opengauss://", "postgresql://", 1)
    return url

def create_db_engine() -> Engine:
    """
    创建数据库引擎（延迟初始化，适配 FastAPI 多进程 Worker 场景）
    针对 openGauss 优化连接参数，增强连接池健壮性
    """
    connect_args = {
        "client_encoding": settings.DB_CLIENT_ENCODING,
        "options": f"-c search_path={settings.DB_SEARCH_PATH}",
    }

    return create_engine(
        # 核心连接地址
        url=_normalize_url(settings.DATABASE_URL),
        # 连接池配置
        poolclass=QueuePool,          # 队列式连接池（SQLAlchemy 推荐）
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_pre_ping=True,           # 执行 SQL 前检测连接有效性，失效则重建
        pool_recycle=settings.DB_POOL_RECYCLE,  # 定期回收空闲连接，避免被 openGauss 断开
        pool_timeout=settings.DB_POOL_TIMEOUT,  # 获取连接超时时间
        # 日志配置
        echo=settings.DEBUG,          # 打印执行的 SQL 语句（开发环境）
        echo_pool=settings.DB_ECHO_POOL or settings.DEBUG,  # 打印连接池日志（开发环境）
        # 兼容配置
        future=True,                  # 启用 SQLAlchemy 2.0 语法（推荐）
        isolation_level=settings.DB_ISOLATION_LEVEL,    #分离级别
        # openGauss 适配
        connect_args=connect_args,
    )

# 全局数据库引擎（多进程下每个 Worker 会重新初始化，避免进程安全问题）
engine = create_db_engine()

# 首次连接时，为方言的版本解析增加兼容 openGauss 的兜底实现
@event.listens_for(engine, "first_connect")
def _patch_dialect_version_parser(conn, conn_rec):
    dialect = engine.dialect
    orig = getattr(dialect, "_get_server_version_info", None)
    if not orig:
        return

    def _patched_get_server_version_info(connection):
        try:
            return orig(connection)
        except AssertionError:
            # 无法从字符串解析版本：手动解析 openGauss 版本或返回保底 PG 版本
            try:
                ver = connection.exec_driver_sql("select version()").scalar()
                m = re.search(r"openGauss\s+(\d+)\.(\d+)\.(\d+)", ver or "")
                if m:
                    return tuple(map(int, m.groups()))
            except Exception:
                pass
            return (14, 0)

    # 仅在首次连接阶段替换解析器，避免后续多次替换
    setattr(dialect, "_get_server_version_info", _patched_get_server_version_info)

# 连接建立后确保编码与 search_path（兼容 openGauss）
@event.listens_for(engine, "connect")
def _on_connect(dbapi_conn, conn_rec):
    try:
        with dbapi_conn.cursor() as cur:
            cur.execute(f"SET CLIENT_ENCODING TO '{settings.DB_CLIENT_ENCODING}'")
            cur.execute(f"SET search_path TO {settings.DB_SEARCH_PATH}")
    except Exception:
        # 某些驱动可能不支持上述语句，忽略以避免影响连接
        pass

# 修正 openGauss 版本字符串导致的方言初始化失败：为 DBAPI 填充 server_version
@event.listens_for(engine, "connect")
def _fix_opengauss_server_version(dbapi_conn, conn_rec):
    try:
        sv = getattr(dbapi_conn, "server_version", 0)
        if not sv:
            cur = dbapi_conn.cursor()
            cur.execute("select version()")
            ver = cur.fetchone()[0]
            cur.close()
            # 解析如：openGauss 7.0.0-RC1 ...
            m = re.search(r"openGauss\s+(\d+)\.(\d+)\.(\d+)", ver)
            if m:
                major, minor, patch = map(int, m.groups())
                dbapi_conn.server_version = major * 10000 + minor * 100 + patch
            else:
                # 保底设置为接近 PG14 的值，避免 SQLAlchemy 断言失败
                dbapi_conn.server_version = 140000
    except Exception:
        # 最保守兜底：确保存在一个合理值
        if not getattr(dbapi_conn, "server_version", None):
            dbapi_conn.server_version = 140000

# 会话工厂（配置事务行为）
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,        # 关闭自动刷新（避免不必要的数据库交互）
    autocommit=False,       # 关闭自动提交（手动控制事务）
    future=True,            # 启用 SQLAlchemy 2.0 会话
    expire_on_commit=False, # 提交后不自动过期对象，提升查询性能
)

def get_db() -> Iterator[SqlAlchemySession]:
    """
    FastAPI 依赖项：提供数据库会话
    特性：异常自动回滚 + 最终确保关闭会话
    """
    # 创建会话实例
    db = SessionLocal()
    try:
        # 生成会话供接口使用
        yield db
    except Exception as e:
        # 捕获异常：回滚事务，避免脏数据
        db.rollback()
        raise e
    finally:
        # 无论是否异常，最终关闭会话（释放连接池连接）
        db.close()

