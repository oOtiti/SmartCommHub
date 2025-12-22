FROM python:3.11-slim

# 系统依赖：psycopg2 需要 libpq-dev；构建工具与时区、健康检查用 curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev tzdata curl \
    && rm -rf /var/lib/apt/lists/*

# 依赖分层安装（便于缓存复用）
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# 复制后端源码
COPY . /app

# 运行环境
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV LOG_TAG=backend
ENV RUN_CMD="uvicorn app.main:app --host 0.0.0.0 --port 18000"

# 服务端口
EXPOSE 18000

# 容器内健康检查：访问 /api/healthz
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://127.0.0.1:18000/api/healthz || exit 1

# 默认启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "18000"]