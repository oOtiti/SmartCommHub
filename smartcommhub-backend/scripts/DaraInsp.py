import json
import sys
import argparse
import os
from typing import Any, Dict, Optional
from decimal import Decimal
import datetime as dt
import uuid
import warnings

from sqlalchemy import create_engine, event, inspect
from sqlalchemy.engine import URL, make_url
from sqlalchemy.types import TypeEngine
from sqlalchemy.pool import QueuePool
from sqlalchemy import exc as sa_exc

from app.core.config import settings
from app.core.logging import logger

# 忽略无法识别类型的方言告警（如 tinyint）
warnings.filterwarnings(
    "ignore",
    category=sa_exc.SAWarning,
    message=r"Did not recognize type .* of column .*"
)

def make_json_safe(obj: Any) -> Any:
    from datetime import date, datetime, time
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, (date, datetime, time)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, set):
        return sorted(list(obj))
    if isinstance(obj, TypeEngine):
        return str(obj)
    if isinstance(obj, dict):
        return {k: make_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [make_json_safe(v) for v in obj]
    return str(obj)

def mask(s: Optional[str], keep: int = 2) -> str:
    if not s:
        return ""
    return s[:keep] + "***"

def log_dsn(url_str: str) -> None:
    u = make_url(url_str)
    logger.info(
        "DSN: driver=%s host=%s port=%s db=%s user=%s",
        u.drivername,
        mask(u.host),
        str(u.port),
        mask(u.database),
        mask(u.username),
    )

def build_url(
    url: Optional[str],
    driver: str,
    host: str,
    port: int,
    user: str,
    password: str,
    database: str,
) -> str:
    if url:
        return url
    # URL.create 自动处理特殊字符
    return str(
        URL.create(
            drivername=driver,
            username=user,
            password=password,
            host=host,
            port=port,
            database=database,
        )
    )

def collect(dsn: str, schema: str) -> Dict[str, Any]:
    engine = create_engine(
        dsn,
        poolclass=QueuePool,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_pre_ping=True,
        echo=settings.DB_ECHO_POOL,
        future=True,
    )

    # 设置编码与 search_path（openGauss 兼容）
    @event.listens_for(engine, "connect")
    def _on_connect(dbapi_conn, conn_rec):
        with dbapi_conn.cursor() as cur:
            cur.execute(f"SET CLIENT_ENCODING TO '{settings.DB_CLIENT_ENCODING}'")
            cur.execute(f"SET search_path TO {schema}")

    insp = inspect(engine)
    result: Dict[str, Any] = {"schema": schema, "tables": []}
    tables = insp.get_table_names(schema=schema)
    for t in tables:
        cols = insp.get_columns(t, schema=schema)
        pks = insp.get_pk_constraint(t, schema=schema)
        fks = insp.get_foreign_keys(t, schema=schema)
        idx = insp.get_indexes(t, schema=schema)
        result["tables"].append({
            "name": t,
            "columns": cols,
            "primary_key": pks,
            "foreign_keys": fks,
            "indexes": idx,
        })
    return result

def main():
    parser = argparse.ArgumentParser(description="openGauss schema introspection")
    parser.add_argument("--url", dest="url", default=None, help="完整数据库URL（可选）")
    parser.add_argument("--driver", default="opengauss+psycopg2", help="驱动，默认 opengauss+psycopg2")
    parser.add_argument("--host", default=None, help="数据库主机（与 --url 二选一）")
    parser.add_argument("--port", type=int, default=15432, help="端口，默认 15432")
    parser.add_argument("--user", default=None, help="用户名")
    parser.add_argument("--password", default=None, help="密码（推荐通过该参数传入，避免手写 URL 编码问题）")
    parser.add_argument("--db", dest="database", default=None, help="数据库名")
    parser.add_argument("--schema", default=settings.DB_SEARCH_PATH, help="schema，默认 config.DB_SEARCH_PATH")
    parser.add_argument("--out", default=None, help="输出文件路径（可选）")
    args = parser.parse_args()

    # 决定最终 DSN：优先 --url，其次分字段，其次 settings.DATABASE_URL
    use_cli_dsn = all([args.host, args.user, args.password, args.database])
    dsn = build_url(
        url=args.url if args.url else (None if use_cli_dsn else settings.DATABASE_URL),
        driver=args.driver,
        host=args.host or "localhost",
        port=args.port,
        user=args.user or "username",
        password=args.password or "password",
        database=args.database or "smartcommhub",
    )

    logger.info("开始采集 schema: %s", args.schema)
    log_dsn(dsn)

    try:
        data = collect(dsn, args.schema)
    except Exception as e:
        logger.exception(
            "采集失败，请检查：1) 账号密码是否正确（注意密码中的特殊字符需转义或用 --password 传参）"
            " 2) host/port 是否可达 3) 数据库与 schema 是否存在。异常: %s", e
        )
        sys.exit(1)

    ts = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    out_json = args.out or f"scripts/tbl_stru/schema_snapshot_{args.schema}_{ts}.json"
    os.makedirs(os.path.dirname(out_json), exist_ok=True)

    data_safe = make_json_safe(data)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(data_safe, f, ensure_ascii=False, indent=2)

    print(out_json)
    logger.info("Schema snapshot saved: %s", out_json)

if __name__ == "__main__":
    main()