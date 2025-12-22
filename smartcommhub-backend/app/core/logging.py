import logging
import os
from pathlib import Path
from logging.handlers import RotatingFileHandler

try:
    from app.core.config import settings  # type: ignore
except Exception:  # 兜底：未能加载 settings 时采用默认
    class _Default:
        DEBUG = True
        LOG_LEVEL = "INFO"
        LOG_FILE = "logs/app.log"
    settings = _Default()


def _backend_root() -> Path:
    """获取 smartcommhub-backend 根目录（app/core -> app -> backend 根）。"""
    return Path(__file__).resolve().parent.parent.parent


def resolve_log_file(log_file: str) -> str:
    """相对路径统一定位到 backend/logs；绝对路径保持不变。"""
    if os.path.isabs(log_file):
        target = Path(log_file)
    else:
        target = _backend_root() / log_file
    target.parent.mkdir(parents=True, exist_ok=True)
    return str(target)


class ContextFilter(logging.Filter):
    """在日志记录中注入 tag/cmd 便于定位来源。"""
    def __init__(self, tag: str = "backend", cmd: str = "") -> None:
        super().__init__()
        self.tag = tag
        self.cmd = cmd

    def filter(self, record: logging.LogRecord) -> bool:  # type: ignore[override]
        # 给记录动态添加字段
        setattr(record, "tag", self.tag)
        setattr(record, "cmd", self.cmd)
        return True


# 读取环境变量（Dockerfile 中已设置 LOG_TAG/RUN_CMD）
_TAG = os.getenv("LOG_TAG", "backend")
_CMD = os.getenv("RUN_CMD", "")

logger = logging.getLogger("smartcommhub")
logger.setLevel(getattr(logging, str(getattr(settings, "LOG_LEVEL", "INFO")).upper(), logging.INFO))
logger.propagate = False

ctx_filter = ContextFilter(tag=_TAG, cmd=_CMD)

# 控制台输出（默认开启）
sh = logging.StreamHandler()
sh.addFilter(ctx_filter)
sh.setLevel(logger.level)
sh.setFormatter(logging.Formatter(
    "%(asctime)s %(levelname)s [%(tag)s] %(name)s: %(message)s%(cmd)s",
    datefmt="%Y-%m-%d %H:%M:%S",
))
logger.addHandler(sh)

# 文件输出（按 LOG_TO_FILE 控制，默认 False）
LOG_TO_FILE = str(getattr(settings, "LOG_TO_FILE", os.getenv("LOG_TO_FILE", "False"))).lower() in ("1", "true", "yes", "on")
LOG_FILE = resolve_log_file(str(getattr(settings, "LOG_FILE", os.getenv("LOG_FILE", "logs/app.log"))))

if LOG_TO_FILE:
    fh = RotatingFileHandler(LOG_FILE, maxBytes=5_000_000, backupCount=3, encoding="utf-8")
    fh.addFilter(ctx_filter)
    fh.setLevel(logger.level)
    fh.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)s [%(tag)s] %(name)s %(filename)s:%(lineno)d: %(message)s%(cmd)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    logger.addHandler(fh)