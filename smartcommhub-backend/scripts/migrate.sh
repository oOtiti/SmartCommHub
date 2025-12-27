#!/usr/bin/env bash
set -euo pipefail

# 一键迁移：结构→字典→加密→导入→报告
# 使用：
#   chmod +x migrate.sh
#   ./migrate.sh --rows 100000 --clean --seed 42 --report

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_DIR="$ROOT_DIR/sql"
PY_DIR="$ROOT_DIR/python_scripts4db_init"
LOG_DIR="$ROOT_DIR/logs"
# 后端根目录（用于读取 .env）
BACKEND_DIR="$(cd "$ROOT_DIR/.." && pwd)"
ENV_FILE="$BACKEND_DIR/.env"

ROWS=10000
BATCH_SIZE=5000
WORKERS=8
SEED=1
CLEAN=false
REPORT=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rows) ROWS="$2"; shift 2;;
    --batch-size) BATCH_SIZE="$2"; shift 2;;
    --workers) WORKERS="$2"; shift 2;;
    --seed) SEED="$2"; shift 2;;
    --clean) CLEAN=true; shift;;
    --report) REPORT=true; shift;;
    *) echo "未知参数: $1"; exit 1;;
  esac
done

mkdir -p "$LOG_DIR"

echo "[env] 读取 .env 中的 DATABASE_URL（如存在）：$ENV_FILE"
if [[ -z "${DATABASE_URL:-}" && -f "$ENV_FILE" ]]; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | sed -E 's/^DATABASE_URL=//')
  # 保持原值（不处理引号），避免解析异常
fi

# 兼容 psql：将 opengauss+psycopg2 URL 转换为 postgresql URL
if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL_URL="${DATABASE_URL/opengauss+psycopg2/postgresql}"
  # 供导入器使用的异步URL（asyncpg）
  ASYNC_URL="$DATABASE_URL"
  ASYNC_URL="${ASYNC_URL/opengauss+psycopg2/postgresql+asyncpg}"
  ASYNC_URL="${ASYNC_URL/postgresql+psycopg2/postgresql+asyncpg}"
else
  echo "ERROR: 未检测到 DATABASE_URL 环境变量，请在 .env 或当前会话中设置。" >&2
  exit 1
fi
echo "[env] 使用连接: $PSQL_URL"

echo "[1/5] 结构迁移: 01_schema_v1.sql"
psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$SQL_DIR/01_schema_v1.sql"

echo "[1b/5] 家庭组结构: 04_family_groups.sql"
psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$SQL_DIR/04_family_groups.sql"

echo "[1c/5] 告警结构: 05_alerts.sql"
psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$SQL_DIR/05_alerts.sql"

echo "[2/5] 字典数据: 03_seed_dict.sql"
psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$SQL_DIR/03_seed_dict.sql"

echo "[3/5] 列加密: 02_ted_encrypt.sql"
psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$SQL_DIR/02_ted_encrypt.sql"

echo "[4/5] 数据导入: data_importer_psycopg2.py"
# 为确保兼容 openGauss 的 server_version 输出，导入器使用 psycopg2 原生驱动
SYNC_URL="$DATABASE_URL"
SYNC_URL="${SYNC_URL/opengauss+psycopg2/postgresql}"
SYNC_URL="${SYNC_URL/postgresql+psycopg2/postgresql}"
DATABASE_URL="$SYNC_URL" python "$PY_DIR/data_importer_psycopg2.py" --rows "$ROWS" --batch-size "$BATCH_SIZE" --seed "$SEED" $( $CLEAN && echo "--clean" ) $( $REPORT && echo "--report" )

echo "[5/5] 完成，报告位于 logs/import_report.txt"
