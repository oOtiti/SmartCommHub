import logging
import os
from logging.handlers import TimedRotatingFileHandler
from app.core.config import settings

logger = logging.getLogger("smartcommhub")
logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger.propagate = False

# 控制台输出（仅 DEBUG）
if settings.DEBUG:
    sh = logging.StreamHandler()
    sh.setLevel(logger.level)
    sh.setFormatter(logging.Formatter("[%(asctime)s] %(levelname)s %(name)s: %(message)s"))
    logger.addHandler(sh)

# 文件输出
log_dir = os.path.dirname(settings.LOG_FILE) or "."
os.makedirs(log_dir, exist_ok=True)
fh = TimedRotatingFileHandler(settings.LOG_FILE, when="D", interval=1, backupCount=7, encoding="utf-8")
fh.setLevel(logger.level)
fh.setFormatter(logging.Formatter("[%(asctime)s] %(levelname)s %(name)s %(filename)s:%(lineno)d: %(message)s"))
logger.addHandler(fh)